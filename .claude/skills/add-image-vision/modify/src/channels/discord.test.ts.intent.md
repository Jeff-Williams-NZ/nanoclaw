# Intent: src/channels/discord.test.ts

## What Changed
- Added `../group-folder.js` mock (resolveGroupFolderPath returns `/data/sessions/{folder}`)
- Added `../image.js` mock (processImage returns stub with `[Image: attachments/img-1234-abcd.jpg]`)
- Added global `fetch` mock via `vi.stubGlobal` for image downloads
- Updated image attachment tests: now expect processed image paths instead of filename placeholders
- Added test case: falls back to placeholder when image download fails

## Key Sections
- **Mock setup** (top of file): New group-folder mock, image mock, global fetch mock
- **Attachment tests**: Updated expectations for processed images, new failure test

## Invariants (must-keep)
- All existing test sections (connection lifecycle, text message handling, @mention translation, reply context, sendMessage, ownsJid, setTyping, channel properties)
- Existing mock structure (config, logger, env, discord.js)
- Test helpers (createTestOpts, createMessage, currentClient, triggerMessage)
- Non-image attachment tests (video, file placeholders)
