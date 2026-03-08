import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

const SKILL_DIR = path.resolve(__dirname, '..');

describe('convert-to-podman-container skill package', () => {
  describe('manifest', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(path.join(SKILL_DIR, 'manifest.yaml'), 'utf-8');
    });

    it('has a valid manifest.yaml', () => {
      expect(fs.existsSync(path.join(SKILL_DIR, 'manifest.yaml'))).toBe(true);
      expect(content).toContain('skill: convert-to-podman-container');
      expect(content).toContain('version: 1.0.0');
    });

    it('has no npm dependencies', () => {
      expect(content).toContain('npm_dependencies: {}');
    });

    it('conflicts with apple container', () => {
      expect(content).toContain('convert-to-apple-container');
    });

    it('lists all modify files', () => {
      expect(content).toContain('src/container-runtime.ts');
      expect(content).toContain('src/container-runtime.test.ts');
      expect(content).toContain('src/container-runner.ts');
      expect(content).toContain('container/build.sh');
    });
  });

  describe('modify/ files exist', () => {
    const modifyFiles = [
      'src/container-runtime.ts',
      'src/container-runtime.test.ts',
      'src/container-runner.ts',
      'container/build.sh',
    ];

    for (const file of modifyFiles) {
      it(`includes modify/${file}`, () => {
        const filePath = path.join(SKILL_DIR, 'modify', file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    }
  });

  describe('intent files exist', () => {
    const intentFiles = [
      'src/container-runtime.ts.intent.md',
      'src/container-runtime.test.ts.intent.md',
      'src/container-runner.ts.intent.md',
      'container/build.sh.intent.md',
    ];

    for (const file of intentFiles) {
      it(`includes modify/${file}`, () => {
        const filePath = path.join(SKILL_DIR, 'modify', file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    }
  });

  describe('modify/src/container-runtime.ts', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(
        path.join(SKILL_DIR, 'modify', 'src', 'container-runtime.ts'),
        'utf-8',
      );
    });

    it('uses podman as runtime binary', () => {
      expect(content).toContain("CONTAINER_RUNTIME_BIN = 'podman'");
    });

    it('preserves exported API', () => {
      expect(content).toContain('export const CONTAINER_RUNTIME_BIN');
      expect(content).toContain('export function readonlyMountArgs');
      expect(content).toContain('export function stopContainer');
      expect(content).toContain('export function ensureContainerRuntimeRunning');
      expect(content).toContain('export function cleanupOrphans');
    });
  });

  describe('modify/src/container-runner.ts', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(
        path.join(SKILL_DIR, 'modify', 'src', 'container-runner.ts'),
        'utf-8',
      );
    });

    it('adds --network host for localhost access', () => {
      expect(content).toContain("'--network'");
      expect(content).toContain("'host'");
    });

    it('has --userns=keep-id for podman rootless', () => {
      expect(content).toContain('--userns=keep-id');
    });

    it('preserves core structure', () => {
      expect(content).toContain('export async function runContainerAgent');
      expect(content).toContain('function buildContainerArgs');
    });
  });

  describe('modify/container/build.sh', () => {
    it('defaults to podman runtime', () => {
      const content = fs.readFileSync(
        path.join(SKILL_DIR, 'modify', 'container', 'build.sh'),
        'utf-8',
      );
      expect(content).toContain('CONTAINER_RUNTIME:-podman');
    });
  });
});
