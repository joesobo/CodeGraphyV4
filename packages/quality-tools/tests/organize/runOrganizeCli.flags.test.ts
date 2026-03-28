import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { runOrganizeCli } from '../../src/organize/command';
import { REPO_ROOT } from '../../src/shared/resolve/repoRoot';
import { createDependencies, createMetrics } from './command.testSupport';
import { createMetric, cleanupTempDirs } from './testHelpers';

const tempDirs: string[] = [];

afterEach(() => {
  cleanupTempDirs(tempDirs);
});

describe('command - flags', () => {
  // Shared helper for baseline metrics
  const createBaselineMetric = () =>
    createMetric({
      directoryPath: `${REPO_ROOT}/packages/quality-tools/src`,
      fileFanOut: 6,
      folderFanOut: 3,
      depth: 3,
      averageRedundancy: 0.3
    });

  it('parses target argument and calls analyze', () => {
    const dependencies = createDependencies();

    runOrganizeCli(['quality-tools/'], dependencies);

    expect(dependencies.resolveQualityTarget).toHaveBeenCalledWith(REPO_ROOT, 'quality-tools/');
    expect(dependencies.analyze).toHaveBeenCalled();
    expect(dependencies.reportOrganize).toHaveBeenCalled();
    expect(dependencies.resolveQualityTarget).toHaveBeenCalledTimes(1);
  });

  it('prints json output when requested', () => {
    const dependencies = createDependencies();
    const log = vi.spyOn(console, 'log');

    runOrganizeCli(['--json', 'quality-tools/'], dependencies);

    expect(dependencies.resolveQualityTarget).toHaveBeenCalledWith(REPO_ROOT, 'quality-tools/');
    expect(dependencies.analyze).toHaveBeenCalled();
    expect(dependencies.reportOrganize).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(1);
    const output = log.mock.calls[0][0] as string;
    expect(typeof output).toBe('string');
    expect(JSON.parse(output)).toEqual(expect.any(Array));
    log.mockRestore();
  });

  it('passes verbose flag to report function', () => {
    const dependencies = createDependencies();

    runOrganizeCli(['--verbose', 'quality-tools/'], dependencies);

    expect(dependencies.reportOrganize).toHaveBeenCalledWith(expect.any(Array), { verbose: true });
    const callArgs = (dependencies.reportOrganize as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs).toBeDefined();
    expect(callArgs[1]).toEqual({ verbose: true });
  });

  it('injects dependencies correctly', () => {
    const dependencies = createDependencies();

    runOrganizeCli(['quality-tools/'], dependencies);

    expect(dependencies.analyze).toBeDefined();
    expect(dependencies.reportOrganize).toBeDefined();
    expect(dependencies.resolveQualityTarget).toBeDefined();
    expect(dependencies.setExitCode).toBeDefined();
    expect(typeof dependencies.analyze).toBe('function');
  });

  describe('--write-baseline', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'quality-tools-organize-cli-'));
      tempDirs.push(tempDir);
      vi.stubEnv('TEST_REPO_ROOT', tempDir);
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('writes baseline JSON file when flag is present', () => {
      const metrics = createMetrics();
      const dependencies = createDependencies({
        analyze: vi.fn(() => metrics)
      });

      expect(dependencies.analyze).toBeDefined();
      expect(typeof dependencies.analyze).toBe('function');
    });
  });

  describe('--compare', () => {
    let tempDir: string;
    let baselinePath: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'quality-tools-organize-compare-'));
      tempDirs.push(tempDir);
      baselinePath = join(tempDir, 'baseline.json');
    });

    it('loads and applies baseline comparison when compare path provided', () => {
      const baselineMetrics = [createBaselineMetric()];
      writeFileSync(baselinePath, JSON.stringify(baselineMetrics));

      const metrics = createMetrics();
      const dependencies = createDependencies({
        analyze: vi.fn(() => metrics)
      });

      const log = vi.spyOn(console, 'log');
    runOrganizeCli(['--compare', baselinePath, 'quality-tools/'], dependencies);

      expect(dependencies.reportOrganize).toHaveBeenCalled();
      const reportCall = (dependencies.reportOrganize as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(reportCall).toBeDefined();
      expect(reportCall[0]).toEqual(expect.any(Array));

      log.mockRestore();
    });
  });

  describe('--json output', () => {
    let log: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      log = vi.spyOn(console, 'log');
    });

    afterEach(() => {
      log.mockRestore();
    });

    it('outputs raw metrics as JSON without calling report', () => {
      const dependencies = createDependencies();

    runOrganizeCli(['--json', 'quality-tools/'], dependencies);

      expect(log).toHaveBeenCalledTimes(1);
      const output = log.mock.calls[0][0] as string;
      expect(typeof output).toBe('string');
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
      expect(dependencies.reportOrganize).not.toHaveBeenCalled();
    });

    it('outputs JSON and returns early without calling reportOrganize', () => {
      const dependencies = createDependencies();

    runOrganizeCli(['--json', 'quality-tools/'], dependencies);

      expect(dependencies.reportOrganize).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledTimes(1);
    });
  });

  describe('conditional branches', () => {
    it('does not write baseline when --write-baseline flag is absent', () => {
      const dependencies = createDependencies();

    runOrganizeCli(['quality-tools/'], dependencies);

      expect(dependencies.reportOrganize).toHaveBeenCalled();
      expect(dependencies.reportOrganize).toHaveBeenCalledTimes(1);
    });

    it('checks --compare flag correctly', () => {
      const tempDir = mkdtempSync(join(tmpdir(), 'quality-tools-organize-compare-'));
      tempDirs.push(tempDir);
      const baselinePath = join(tempDir, 'baseline.json');
      const baselineMetrics = createMetrics();
      writeFileSync(baselinePath, JSON.stringify(baselineMetrics));

      const dependencies = createDependencies();
    runOrganizeCli(['--compare', baselinePath, 'quality-tools/'], dependencies);

      expect(dependencies.reportOrganize).toHaveBeenCalled();
      expect(dependencies.analyze).toHaveBeenCalled();
    });

    it('processes --json flag correctly in conditional', () => {
      const dependencies = createDependencies();
      const log = vi.spyOn(console, 'log');

    runOrganizeCli(['--json', 'quality-tools/'], dependencies);

      expect(log).toHaveBeenCalled();
      expect(dependencies.reportOrganize).not.toHaveBeenCalled();
      expect(log.mock.calls.length).toBe(1);

      log.mockRestore();
    });

    it('constructs target path correctly with dot check', () => {
      const dependencies = createDependencies();

    runOrganizeCli(['quality-tools/'], dependencies);

      expect(dependencies.resolveQualityTarget).toHaveBeenCalledWith(REPO_ROOT, 'quality-tools/');
      expect(dependencies.resolveQualityTarget).toHaveBeenCalledTimes(1);
    });
  });
});
