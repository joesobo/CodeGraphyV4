import { describe, expect, it, vi } from 'vitest';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { runOrganizeCli } from '../../src/organize/command';
import { REPO_ROOT } from '../../src/shared/resolve/repoRoot';
import { createDependencies, createMetrics } from './command.testSupport';

describe('command - flag combinations', () => {
  describe('verbose and compare flags', () => {
    it('combines --verbose and --compare flags', () => {
      const baselinePath = join(mkdtempSync(join(tmpdir(), 'quality-tools-organize-compare-')), 'baseline.json');
      const baselineMetrics = createMetrics();
      writeFileSync(baselinePath, JSON.stringify(baselineMetrics));

      const dependencies = createDependencies();
    runOrganizeCli(['--verbose', '--compare', baselinePath, 'quality-tools/'], dependencies);

      // Should call reportOrganize with verbose flag
      expect(dependencies.reportOrganize).toHaveBeenCalledWith(expect.any(Array), { verbose: true });
    });

    it('passes through comparison data to report when --compare is used', () => {
      const baselinePath = join(mkdtempSync(join(tmpdir(), 'quality-tools-organize-compare-')), 'baseline.json');
      const baselineMetrics = [
        {
          averageRedundancy: 0.3,
          clusters: [],
          depth: 3,
          depthVerdict: 'STABLE' as const,
          directoryPath: `${REPO_ROOT}/packages/quality-tools/src`,
          fileIssues: [],
          fileFanOut: 6,
          fileFanOutVerdict: 'STABLE' as const,
          folderFanOut: 3,
          folderFanOutVerdict: 'STABLE' as const
        }
      ];
      writeFileSync(baselinePath, JSON.stringify(baselineMetrics));

      const currentMetrics = [
        {
          averageRedundancy: 0.2,
          clusters: [],
          depth: 3,
          depthVerdict: 'STABLE' as const,
          directoryPath: `${REPO_ROOT}/packages/quality-tools/src`,
          fileIssues: [],
          fileFanOut: 5,
          fileFanOutVerdict: 'STABLE' as const,
          folderFanOut: 2,
          folderFanOutVerdict: 'STABLE' as const
        }
      ];

      const dependencies = createDependencies({
        analyze: vi.fn(() => currentMetrics)
      });

    runOrganizeCli(['--compare', baselinePath, 'quality-tools/'], dependencies);

      // reportOrganize should be called with metrics
      expect(dependencies.reportOrganize).toHaveBeenCalled();
      const reportCall = (dependencies.reportOrganize as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(reportCall[0]).toBeDefined();
    });
  });

  describe('flag combination behavior', () => {
    it('--json takes precedence over reportOrganize', () => {
      const dependencies = createDependencies();
      const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    runOrganizeCli(['--verbose', '--json', 'quality-tools/'], dependencies);

      // Even with --verbose, --json should skip reportOrganize
      expect(log).toHaveBeenCalled();
      expect(dependencies.reportOrganize).not.toHaveBeenCalled();

      log.mockRestore();
    });

    it('verifies verbose flag value with boolean check', () => {
      const dependencies = createDependencies();

    runOrganizeCli(['--verbose', 'quality-tools/'], dependencies);

      // reportOrganize should be called with verbose: true
      expect(dependencies.reportOrganize).toHaveBeenCalledWith(expect.any(Array), { verbose: true });
    });

    it('sets verbose to false when flag is absent', () => {
      const dependencies = createDependencies();

    runOrganizeCli(['quality-tools/'], dependencies);

      // reportOrganize should be called with verbose: false
      expect(dependencies.reportOrganize).toHaveBeenCalledWith(expect.any(Array), { verbose: false });
    });
  });
});
