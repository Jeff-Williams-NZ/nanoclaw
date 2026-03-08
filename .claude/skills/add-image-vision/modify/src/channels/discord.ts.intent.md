# Intent: src/channels/discord.ts

## What Changed
- Added `resolveGroupFolderPath` import from `../group-folder.js`
- Added `processImage` import from `../image.js`
- Replaced attachment placeholder logic with image download/process pipeline
- Images are fetched from Discord CDN via `fetch(att.url)`, processed with `processImage`, and saved to group attachments dir
- Falls back to `[Image: filename]` placeholder on download/process failure
- Non-image attachments (video, audio, file) still use placeholders

## Key Sections
- **Imports** (top of file): New imports for resolveGroupFolderPath, processImage
- **Attachment handler** (inside MessageCreate): Downloads images, calls processImage, falls back to placeholder on error

## Invariants (must-keep)
- DiscordChannel class structure and all existing methods
- Connection lifecycle (connect, disconnect, isConnected)
- @bot mention translation to TRIGGER_PATTERN format
- Reply context handling
- Chat metadata and message delivery flow
- sendMessage with 2000 char split logic
- setTyping, ownsJid, disconnect methods
- registerChannel factory at bottom of file
