# Per-Group Triggers + 2 New Discord Agents

## Problem

NanoClaw uses a single global trigger pattern (`@Andy`) for all groups. The `trigger_pattern` column exists in the DB per group but is never used for matching. Users want distinct agent identities (`@Bob`, `@Sally`) in different channels.

## Solution

Wire up the existing per-group `trigger_pattern` DB field to the actual trigger matching logic, then register 2 new Discord groups with custom triggers.

## Code Changes

### 1. `src/index.ts` — Use per-group trigger pattern

Replace the two locations that use global `TRIGGER_PATTERN` with a per-group regex built from `group.trigger`:

- Line ~169 (missed messages path): `TRIGGER_PATTERN.test(...)` → per-group regex
- Line ~409 (message loop path): same change

Helper function to build regex from the stored trigger string (e.g. `"@Bob"` → `/^@Bob\b/i`).

### 2. `src/channels/discord.ts` — Per-group mention translation

Currently translates Discord `<@botId>` mentions into `@Andy`. Needs to look up the registered group for the channel and use its trigger pattern instead.

Fallback: if channel is not registered, use global `ASSISTANT_NAME`.

### 3. `src/config.ts` — Keep as default fallback

`TRIGGER_PATTERN` remains as the fallback for groups without a custom trigger.

## New Groups

| Field | Coding Agent | Research Agent |
|-------|-------------|----------------|
| Discord channel | `#coding` | `#research` |
| Trigger | `@Bob` | `@Sally` |
| Folder | `discord_coding` | `discord_research` |
| Requires trigger | Yes | Yes |
| CLAUDE.md | Coding specialist | Research specialist |

## Existing Group

The existing `#general` channel retains its current trigger pattern (`@Andy`).
