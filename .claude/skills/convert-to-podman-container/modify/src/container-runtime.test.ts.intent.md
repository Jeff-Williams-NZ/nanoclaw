# Intent: src/container-runtime.test.ts

## What Changed
- Updated test expectations from `'docker'` to `'podman'` for CONTAINER_RUNTIME_BIN
- Updated command string assertions to use `podman` instead of `docker`

## Key Sections
- **CONTAINER_RUNTIME_BIN tests**: Assert value is `'podman'`
- **Command generation tests**: Verify podman binary in generated commands

## Invariants (must-keep)
- All existing test cases and describe blocks
- Test coverage for readonlyMountArgs, stopContainer, ensureContainerRuntimeRunning, cleanupOrphans
