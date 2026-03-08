# Intent: container/build.sh

## What Changed
- Changed default `CONTAINER_RUNTIME` from `docker` to `podman`

## Key Sections
- **CONTAINER_RUNTIME variable**: `CONTAINER_RUNTIME="${CONTAINER_RUNTIME:-podman}"`

## Invariants (must-keep)
- Script structure (set -e, SCRIPT_DIR, IMAGE_NAME, TAG)
- Build command using ${CONTAINER_RUNTIME}
- Success message with test command
