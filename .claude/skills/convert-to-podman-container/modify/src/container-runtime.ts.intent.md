# Intent: src/container-runtime.ts

## What Changed
- Changed `CONTAINER_RUNTIME_BIN` from `'docker'` to `'podman'`

## Key Sections
- **CONTAINER_RUNTIME_BIN** constant (top of file): Set to `'podman'`

## Invariants (must-keep)
- All exported functions: `readonlyMountArgs`, `stopContainer`, `ensureContainerRuntimeRunning`, `cleanupOrphans`
- Exported constant: `CONTAINER_RUNTIME_BIN`
- Error handling and logging patterns
- Container orphan cleanup logic
