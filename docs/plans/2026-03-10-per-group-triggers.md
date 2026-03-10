# Per-Group Triggers + 2 New Discord Agents Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Support per-group trigger patterns so different groups can use different trigger names (@Bob, @Sally, @Andy), then register 2 new Discord groups with custom triggers.

**Architecture:** The DB already stores `trigger_pattern` per group, but the matching code in `index.ts` uses a single global `TRIGGER_PATTERN`. We add a helper to build a regex from the stored trigger string, use it in both trigger-check locations in `index.ts`, and update `discord.ts` to translate Discord mentions to the correct per-group trigger. The global `ASSISTANT_NAME` continues to be used for bot-message filtering in DB queries (unrelated to trigger matching).

**Tech Stack:** TypeScript, Vitest, SQLite (better-sqlite3), discord.js

---

### Task 1: Add `buildTriggerRegex` helper to config.ts

**Files:**
- Modify: `src/config.ts:57-64`
- Test: `src/formatting.test.ts`

**Step 1: Write the failing test**

Add to `src/formatting.test.ts` after the existing `TRIGGER_PATTERN` describe block:

```typescript
import { buildTriggerRegex, ASSISTANT_NAME, TRIGGER_PATTERN } from './config.js';

// --- buildTriggerRegex ---

describe('buildTriggerRegex', () => {
  it('builds regex from @Name trigger string', () => {
    const re = buildTriggerRegex('@Bob');
    expect(re.test('@Bob hello')).toBe(true);
    expect(re.test('@bob hello')).toBe(true);
    expect(re.test('hello @Bob')).toBe(false);
    expect(re.test('@Bobby hello')).toBe(false);
  });

  it('falls back to global TRIGGER_PATTERN for undefined', () => {
    const re = buildTriggerRegex(undefined);
    expect(re).toBe(TRIGGER_PATTERN);
  });

  it('handles names with special regex characters', () => {
    const re = buildTriggerRegex('@C++Bot');
    expect(re.test('@C++Bot help')).toBe(true);
  });
});
```

Also update the existing import at the top of `formatting.test.ts`:
```typescript
import { ASSISTANT_NAME, TRIGGER_PATTERN, buildTriggerRegex } from './config.js';
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/formatting.test.ts --reporter=verbose`
Expected: FAIL — `buildTriggerRegex` is not exported from config.ts

**Step 3: Write minimal implementation**

In `src/config.ts`, add after the `escapeRegex` function (line 59) and before `TRIGGER_PATTERN` (line 61):

```typescript
/**
 * Build a trigger regex from a stored trigger string (e.g. "@Bob" → /^@Bob\b/i).
 * Returns the global TRIGGER_PATTERN if no trigger is provided.
 */
export function buildTriggerRegex(trigger?: string): RegExp {
  if (!trigger) return TRIGGER_PATTERN;
  // Strip leading @ if present, then build the regex
  const name = trigger.startsWith('@') ? trigger.slice(1) : trigger;
  return new RegExp(`^@${escapeRegex(name)}\\b`, 'i');
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/formatting.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add src/config.ts src/formatting.test.ts
git commit -m "feat: add buildTriggerRegex helper for per-group triggers"
```

---

### Task 2: Use per-group trigger in `processGroupMessages` (index.ts line ~169)

**Files:**
- Modify: `src/index.ts:1-10,164-172`

**Step 1: Update import**

In `src/index.ts`, change the import from config (line 4-10):

Replace:
```typescript
import {
  ASSISTANT_NAME,
  IDLE_TIMEOUT,
  POLL_INTERVAL,
  TIMEZONE,
  TRIGGER_PATTERN,
} from './config.js';
```

With:
```typescript
import {
  ASSISTANT_NAME,
  buildTriggerRegex,
  IDLE_TIMEOUT,
  POLL_INTERVAL,
  TIMEZONE,
} from './config.js';
```

**Step 2: Update processGroupMessages trigger check**

Replace lines 167-171:
```typescript
    const hasTrigger = missedMessages.some(
      (m) =>
        TRIGGER_PATTERN.test(m.content.trim()) &&
        (m.is_from_me || isTriggerAllowed(chatJid, m.sender, allowlistCfg)),
    );
```

With:
```typescript
    const groupTrigger = buildTriggerRegex(group.trigger);
    const hasTrigger = missedMessages.some(
      (m) =>
        groupTrigger.test(m.content.trim()) &&
        (m.is_from_me || isTriggerAllowed(chatJid, m.sender, allowlistCfg)),
    );
```

**Step 3: Run tests to verify nothing breaks**

Run: `npx vitest run src/formatting.test.ts --reporter=verbose`
Expected: PASS (trigger gating tests still pass since they use the global ASSISTANT_NAME pattern)

**Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: use per-group trigger in processGroupMessages"
```

---

### Task 3: Use per-group trigger in `startMessageLoop` (index.ts line ~409)

**Files:**
- Modify: `src/index.ts:405-412`

**Step 1: Update startMessageLoop trigger check**

Replace lines 407-411:
```typescript
            const hasTrigger = groupMessages.some(
              (m) =>
                TRIGGER_PATTERN.test(m.content.trim()) &&
                (m.is_from_me ||
                  isTriggerAllowed(chatJid, m.sender, allowlistCfg)),
            );
```

With:
```typescript
            const groupTrigger = buildTriggerRegex(group.trigger);
            const hasTrigger = groupMessages.some(
              (m) =>
                groupTrigger.test(m.content.trim()) &&
                (m.is_from_me ||
                  isTriggerAllowed(chatJid, m.sender, allowlistCfg)),
            );
```

**Step 2: Remove unused TRIGGER_PATTERN import**

`TRIGGER_PATTERN` is no longer used in `index.ts`. The import was already removed in Task 2.

**Step 3: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: PASS

**Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: use per-group trigger in startMessageLoop"
```

---

### Task 4: Update Discord mention translation to use per-group trigger

**Files:**
- Modify: `src/channels/discord.ts:1-15,78-94`
- Test: `src/channels/discord.test.ts`

**Step 1: Write the failing test**

Add to `src/channels/discord.test.ts` in the `@mention translation` describe block:

```typescript
    it('translates bot mention to per-group trigger when group has custom trigger', async () => {
      const opts = createTestOpts({
        registeredGroups: vi.fn(() => ({
          'dc:1234567890123456': {
            name: 'Coding Channel',
            folder: 'discord_coding',
            trigger: '@Bob',
            added_at: '2024-01-01T00:00:00.000Z',
          },
        })),
      });
      const channel = new DiscordChannel('test-token', opts);
      await channel.connect();

      const msg = createMessage({
        content: '<@999888777> help me with this code',
        mentionsBotId: true,
        guildName: 'Server',
      });
      await triggerMessage(msg);

      expect(opts.onMessage).toHaveBeenCalledWith(
        'dc:1234567890123456',
        expect.objectContaining({
          content: '@Bob help me with this code',
        }),
      );
    });
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/channels/discord.test.ts --reporter=verbose`
Expected: FAIL — content is `@Andy help me with this code` instead of `@Bob`

**Step 3: Update Discord channel to use per-group trigger**

In `src/channels/discord.ts`, update the import (line 9):

Replace:
```typescript
import { ASSISTANT_NAME, TRIGGER_PATTERN } from '../config.js';
```

With:
```typescript
import { ASSISTANT_NAME, buildTriggerRegex } from '../config.js';
```

Then update the mention translation block (lines 78-95):

Replace:
```typescript
      if (this.client?.user) {
        const botId = this.client.user.id;
        const isBotMentioned =
          message.mentions.users.has(botId) ||
          content.includes(`<@${botId}>`) ||
          content.includes(`<@!${botId}>`);

        if (isBotMentioned) {
          // Strip the <@botId> mention to avoid visual clutter
          content = content
            .replace(new RegExp(`<@!?${botId}>`, 'g'), '')
            .trim();
          // Prepend trigger if not already present
          if (!TRIGGER_PATTERN.test(content)) {
            content = `@${ASSISTANT_NAME} ${content}`;
          }
        }
      }
```

With:
```typescript
      if (this.client?.user) {
        const botId = this.client.user.id;
        const isBotMentioned =
          message.mentions.users.has(botId) ||
          content.includes(`<@${botId}>`) ||
          content.includes(`<@!${botId}>`);

        if (isBotMentioned) {
          // Strip the <@botId> mention to avoid visual clutter
          content = content
            .replace(new RegExp(`<@!?${botId}>`, 'g'), '')
            .trim();
          // Use per-group trigger name if the group is registered, otherwise global
          const group = this.opts.registeredGroups()[chatJid];
          const triggerName = group?.trigger?.replace(/^@/, '') || ASSISTANT_NAME;
          const triggerRegex = buildTriggerRegex(group?.trigger);
          // Prepend trigger if not already present
          if (!triggerRegex.test(content)) {
            content = `@${triggerName} ${content}`;
          }
        }
      }
```

**Step 4: Update the mock in discord.test.ts**

Update the mock for config.js at the top of `discord.test.ts` (line 12-15):

Replace:
```typescript
vi.mock('../config.js', () => ({
  ASSISTANT_NAME: 'Andy',
  TRIGGER_PATTERN: /^@Andy\b/i,
}));
```

With:
```typescript
vi.mock('../config.js', () => ({
  ASSISTANT_NAME: 'Andy',
  TRIGGER_PATTERN: /^@Andy\b/i,
  buildTriggerRegex: (trigger?: string) => {
    if (!trigger) return /^@Andy\b/i;
    const name = trigger.startsWith('@') ? trigger.slice(1) : trigger;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^@${escaped}\\b`, 'i');
  },
}));
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run src/channels/discord.test.ts --reporter=verbose`
Expected: PASS

**Step 6: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: PASS

**Step 7: Commit**

```bash
git add src/channels/discord.ts src/channels/discord.test.ts
git commit -m "feat: Discord mention translation uses per-group trigger"
```

---

### Task 5: Add test for per-group trigger gating in formatting.test.ts

**Files:**
- Modify: `src/formatting.test.ts`

**Step 1: Add per-group trigger gating tests**

Add a new describe block after the existing `trigger gating` block in `src/formatting.test.ts`:

```typescript
describe('per-group trigger gating', () => {
  function shouldProcess(
    requiresTrigger: boolean | undefined,
    groupTrigger: string,
    messages: NewMessage[],
  ): boolean {
    if (requiresTrigger === false) return true;
    const re = buildTriggerRegex(groupTrigger);
    return messages.some((m) => re.test(m.content.trim()));
  }

  it('processes when group trigger @Bob is used', () => {
    const msgs = [makeMsg({ content: '@Bob do something' })];
    expect(shouldProcess(true, '@Bob', msgs)).toBe(true);
  });

  it('does not process when wrong trigger is used', () => {
    const msgs = [makeMsg({ content: '@Andy do something' })];
    expect(shouldProcess(true, '@Bob', msgs)).toBe(false);
  });

  it('processes when group trigger @Sally is used case-insensitively', () => {
    const msgs = [makeMsg({ content: '@sally research this' })];
    expect(shouldProcess(true, '@Sally', msgs)).toBe(true);
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run src/formatting.test.ts --reporter=verbose`
Expected: PASS

**Step 3: Commit**

```bash
git add src/formatting.test.ts
git commit -m "test: add per-group trigger gating tests"
```

---

### Task 6: Build and verify

**Files:** None (build + runtime check)

**Step 1: Build the project**

Run: `npm run build`
Expected: Clean build with no errors

**Step 2: Run full test suite**

Run: `npx vitest run --reporter=verbose`
Expected: All tests pass

**Step 3: Commit if any build artifacts changed**

No commit needed — dist/ should be in .gitignore.

---

### Task 7: Create Discord channels and register the 2 new groups

**Files:**
- Create: `groups/discord_coding/CLAUDE.md`
- Create: `groups/discord_research/CLAUDE.md`

This task requires the running NanoClaw instance to interact with Discord. Instead of doing it programmatically, we'll:

**Step 1: Create the group folders and CLAUDE.md files**

Create `groups/discord_coding/CLAUDE.md`:

```markdown
# Bob

You are Bob, a coding assistant. You specialize in software development, code review, debugging, and architecture.

## What You Can Do

- Answer questions and have conversations
- Search the web and fetch content from URLs
- **Browse the web** with `agent-browser` — open pages, click, fill forms, take screenshots, extract data (run `agent-browser open <url>` to start, then `agent-browser snapshot -i` to see interactive elements)
- Read and write files in your workspace
- Run bash commands in your sandbox
- Schedule tasks to run later or on a recurring basis
- Send messages back to the chat

## Your Specialty

You are a **coding specialist**. Focus on:
- Writing clean, idiomatic code
- Code review and improvement suggestions
- Debugging and troubleshooting
- Architecture and design discussions
- Explaining technical concepts clearly

When asked about non-coding topics, you can still help, but lean into your technical expertise.

## Communication

Your output is sent to the user or group.

You also have `mcp__nanoclaw__send_message` which sends a message immediately while you're still working. This is useful when you want to acknowledge a request before starting longer work.

### Internal thoughts

If part of your output is internal reasoning rather than something for the user, wrap it in `<internal>` tags:

```
<internal>Analyzing the code structure...</internal>

Here's what I found in the codebase...
```

Text inside `<internal>` tags is logged but not sent to the user.

## Your Workspace

Files you create are saved in `/workspace/group/`. Use this for notes, code snippets, or anything that should persist.

## Memory

The `conversations/` folder contains searchable history of past conversations. Use this to recall context from previous sessions.

When you learn something important:
- Create files for structured data (e.g., `snippets.md`, `project-notes.md`)
- Split files larger than 500 lines into folders
- Keep an index in your memory for the files you create

## Message Formatting

NEVER use markdown. Only use WhatsApp/Telegram/Discord formatting:
- *single asterisks* for bold (NEVER **double asterisks**)
- _underscores_ for italic
- • bullet points
- ```triple backticks``` for code

No ## headings. No [links](url). No **double stars**.
```

Create `groups/discord_research/CLAUDE.md`:

```markdown
# Sally

You are Sally, a research analyst. You specialize in web research, summarization, fact-finding, and data analysis.

## What You Can Do

- Answer questions and have conversations
- Search the web and fetch content from URLs
- **Browse the web** with `agent-browser` — open pages, click, fill forms, take screenshots, extract data (run `agent-browser open <url>` to start, then `agent-browser snapshot -i` to see interactive elements)
- Read and write files in your workspace
- Run bash commands in your sandbox
- Schedule tasks to run later or on a recurring basis
- Send messages back to the chat

## Your Specialty

You are a **research specialist**. Focus on:
- Web research and finding authoritative sources
- Summarizing long documents and articles
- Fact-checking and cross-referencing information
- Data analysis and trend identification
- Writing clear, well-sourced reports

When asked about non-research topics, you can still help, but lean into your analytical expertise.

## Communication

Your output is sent to the user or group.

You also have `mcp__nanoclaw__send_message` which sends a message immediately while you're still working. This is useful when you want to acknowledge a request before starting longer work.

### Internal thoughts

If part of your output is internal reasoning rather than something for the user, wrap it in `<internal>` tags:

```
<internal>Searching for relevant sources...</internal>

Based on my research, here are the key findings...
```

Text inside `<internal>` tags is logged but not sent to the user.

## Your Workspace

Files you create are saved in `/workspace/group/`. Use this for notes, research findings, or anything that should persist.

## Memory

The `conversations/` folder contains searchable history of past conversations. Use this to recall context from previous sessions.

When you learn something important:
- Create files for structured data (e.g., `sources.md`, `findings.md`)
- Split files larger than 500 lines into folders
- Keep an index in your memory for the files you create

## Message Formatting

NEVER use markdown. Only use WhatsApp/Telegram/Discord formatting:
- *single asterisks* for bold (NEVER **double asterisks**)
- _underscores_ for italic
- • bullet points
- ```triple backticks``` for code

No ## headings. No [links](url). No **double stars**.
```

**Step 2: Create the Discord channels**

The user needs to create 2 new text channels in their Discord server (`#coding` and `#research`), then provide the channel IDs. The channel IDs can be obtained by:
- Enabling Developer Mode in Discord (Settings > Advanced > Developer Mode)
- Right-clicking the channel → Copy Channel ID

Alternatively, we can check the NanoClaw logs after messages are sent in new channels — unregistered channels log their JID.

**Step 3: Register the groups in the database**

Once channel IDs are known, register via the setup script:

```bash
npx tsx setup/index.ts --step register \
  --jid "dc:<coding-channel-id>" \
  --name "NanoClaw-X2-Server #coding" \
  --trigger "@Bob" \
  --folder "discord_coding" \
  --channel discord

npx tsx setup/index.ts --step register \
  --jid "dc:<research-channel-id>" \
  --name "NanoClaw-X2-Server #research" \
  --trigger "@Sally" \
  --folder "discord_research" \
  --channel discord
```

**Step 4: Restart NanoClaw to pick up new groups**

```bash
systemctl --user restart nanoclaw
```

**Step 5: Verify**

Send `@Bob hello` in `#coding` and `@Sally hello` in `#research`. Each should respond with its specialized persona. Verify `@Andy hello` in `#general` still works.

**Step 6: Commit the group folders**

```bash
git add groups/discord_coding/CLAUDE.md groups/discord_research/CLAUDE.md
git commit -m "feat: add coding (Bob) and research (Sally) agent groups"
```
