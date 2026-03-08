---
name: convert-to-podman-container
description: Switch from Docker to Podman for rootless container isolation on Linux/WSL2. Uses --userns=keep-id for bind mount permissions and --network host for localhost access.
---

# Use Podman Skill

Switches the container runtime from Docker to Podman. Podman runs rootless containers without a daemon, making it ideal for Linux and WSL2 environments.

## Changes

- `src/container-runtime.ts`: Sets `CONTAINER_RUNTIME_BIN = 'podman'`
- `src/container-runner.ts`: Adds `--network host` for localhost service access (Ollama, etc.) and uses `--userns=keep-id` for podman rootless bind mount permissions
- `container/build.sh`: Defaults `CONTAINER_RUNTIME` to `podman`

## Phase 1: Pre-flight

1. Check `.nanoclaw/state.yaml` for `convert-to-podman-container` — skip to Phase 3 if already applied
2. Verify Podman is installed:
   ```bash
   podman --version
   ```
3. Verify Podman machine is running (if applicable):
   ```bash
   podman info
   ```

## Phase 2: Apply Code Changes

1. Initialize the skills system if not already done:
   ```bash
   npx tsx scripts/apply-skill.ts --init
   ```

2. Apply the skill:
   ```bash
   npx tsx scripts/apply-skill.ts .claude/skills/convert-to-podman-container
   ```

3. Validate:
   ```bash
   npm run build
   ```

## Phase 3: Configure

1. Build the container image with Podman:
   ```bash
   ./container/build.sh
   ```

2. Restart the service:
   ```bash
   # Linux (systemd)
   systemctl --user restart nanoclaw

   # macOS (launchd)
   launchctl kickstart -k gui/$(id -u)/com.nanoclaw
   ```

## Phase 4: Verify

1. Test container runs:
   ```bash
   echo '{"prompt":"What is 2+2?","groupFolder":"test","chatJid":"test@g.us","isMain":false}' | podman run -i nanoclaw-agent:latest
   ```

2. Send a message to trigger the agent and check logs:
   ```bash
   tail -f logs/nanoclaw.log | grep -i container
   ```

## Troubleshooting

- **"podman: command not found"**: Install Podman for your platform. On Ubuntu: `sudo apt install podman`
- **Permission denied on bind mounts**: The skill uses `--userns=keep-id` to map host UIDs. Ensure your user is in the podman group.
- **Cannot reach localhost services from container**: The skill adds `--network host`. Verify with `podman run --rm --network host curlimages/curl curl -s http://localhost:11434/api/tags`
