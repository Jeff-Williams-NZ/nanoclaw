# Intent: src/container-runner.ts

## What Changed
- Added `--network host` to container args for localhost service access from within containers
- The `--userns=keep-id` logic already exists for podman rootless (guarded by `CONTAINER_RUNTIME_BIN === 'podman'`)

## Key Sections
- **buildContainerArgs()**: Added `args.push('--network', 'host')` before the image name push

## Invariants (must-keep)
- All existing container argument building logic
- Volume mount handling (readonly and writable)
- UID/GID mapping with --userns=keep-id for podman
- Container spawn, output parsing, and lifecycle management
- Log surfacing patterns (OLLAMA, etc.)
- readSecrets() function
- ContainerInput and ContainerOutput interfaces
