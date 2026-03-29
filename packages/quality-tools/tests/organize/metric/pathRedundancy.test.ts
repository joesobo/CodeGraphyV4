import { describe, expect, it } from 'vitest';
import { pathRedundancy } from '../../../src/organize/metric/pathRedundancy';

describe('pathRedundancy', () => {
  describe('basic redundancy calculation', () => {
    it('returns 0.5 when one token is shared with ancestors', () => {
      expect(pathRedundancy('scrap/scrapTypes.ts', ['scrap'])).toBe(0.5);
    });

    it('returns 0 when no tokens are shared with ancestors', () => {
      expect(pathRedundancy('scrap/types.ts', ['scrap'])).toBe(0);
    });

    it('handles multiple ancestor folders', () => {
      expect(pathRedundancy('src/scrap/scrapTypes.ts', ['src', 'scrap'])).toBe(0.5);
    });
  });

  describe('full redundancy', () => {
    it('returns 1.0 when all tokens are redundant', () => {
      // File: scrapData
      // Ancestors: ['scrap', 'data']
      // File tokens: ['scrap', 'data'] (from scrapData)
      // Ancestor tokens: {'scrap', 'data'}
      // shared: 2/2 = 1.0
      expect(pathRedundancy('scrap/data/scrapData.ts', ['scrap', 'data'])).toBe(1.0);
    });

    it('returns 1.0 for identical ancestor and file name', () => {
      expect(pathRedundancy('utils/utils.ts', ['utils'])).toBe(1.0);
    });
  });

  describe('no redundancy', () => {
    it('returns 0 when file name has no shared tokens', () => {
      expect(pathRedundancy('src/metrics.ts', ['src'])).toBe(0);
    });

    it('handles deeply nested paths with no redundancy', () => {
      expect(pathRedundancy('src/lib/utils/metrics.ts', ['src', 'lib', 'utils'])).toBe(0);
    });
  });

  describe('file tokens with no ancestors', () => {
    it('returns 0 when there are no ancestor folders', () => {
      expect(pathRedundancy('metrics.ts', [])).toBe(0);
    });

    it('handles root-level files', () => {
      expect(pathRedundancy('config.ts', [])).toBe(0);
    });
  });

  describe('edge cases with file names', () => {
    it('handles file names without extensions', () => {
      // scrapData (no extension) -> ['scrap', 'data']
      expect(pathRedundancy('scrap/scrapData', ['scrap'])).toBe(0.5);
    });

    it('returns 0 for files with single token that is not in ancestors', () => {
      expect(pathRedundancy('src/config.ts', ['lib'])).toBe(0);
    });

    it('handles CamelCase file names', () => {
      // getReportData -> ['get', 'report', 'data']
      // ancestors: ['reports'] -> ['reports']
      // shared: 0/3 (no 'reports' token in filename)
      expect(pathRedundancy('reports/getReportData.ts', ['reports'])).toBe(0);
    });

    it('handles kebab-case file names', () => {
      // report-data -> ['report', 'data']
      // ancestors: ['reports'] -> ['reports']
      // shared: 0/2 (no 'reports' token in filename, only 'report')
      expect(pathRedundancy('reports/report-data.ts', ['reports'])).toBe(0);
    });
  });

  describe('partial redundancy', () => {
    it('returns partial score for some shared tokens', () => {
      // scrapMetrics -> ['scrap', 'metrics']
      // ancestors: ['scrap', 'lib']
      // shared: 1/2 = 0.5
      expect(pathRedundancy('scrap/scrapMetrics.ts', ['scrap', 'lib'])).toBe(0.5);
    });

    it('handles complex token sets', () => {
      // reportBlockData -> ['report', 'block', 'data']
      // ancestors: ['report', 'blocks', 'src']
      // shared: 1/3 (only 'report')
      expect(pathRedundancy('report/blocks/reportBlockData.ts', ['report', 'blocks'])).toBeCloseTo(1 / 3, 5);
    });

    it('counts each shared token only once per ancestor', () => {
      // test -> ['test']
      // ancestors: ['test', 'test'] (duplicates)
      // shared: 1/1 = 1.0
      expect(pathRedundancy('test/test.ts', ['test', 'test'])).toBe(1.0);
    });
  });

  describe('conventional entry files', () => {
    it('treats App.tsx in an app folder as conventional', () => {
      expect(pathRedundancy('webview/app/App.tsx', ['webview', 'app'])).toBe(0);
    });

    it('treats export.ts in an export folder as conventional', () => {
      expect(pathRedundancy('webview/export/settings/export.ts', ['webview', 'export', 'settings'])).toBe(0);
    });

    it('treats useTheme.ts in a theme folder as conventional', () => {
      expect(pathRedundancy('webview/theme/useTheme.ts', ['webview', 'theme'])).toBe(0);
    });

    it('treats hook-style files under feature folders as conventional when the hook matches the folder', () => {
      expect(pathRedundancy('features/editor/useEditorState.ts', ['features', 'editor'])).toBe(0);
    });

    it('still flags conventional-looking names that do not actually match their folder', () => {
      expect(pathRedundancy('webview/app/appState.tsx', ['webview', 'app'])).toBe(0.5);
    });
  });

  describe('case insensitivity', () => {
    it('matches tokens case-insensitively', () => {
      // ScrapData -> ['scrap', 'data']
      // ancestors: ['SCRAP']
      // shared: 1/2 = 0.5
      expect(pathRedundancy('SCRAP/ScrapData.ts', ['SCRAP'])).toBe(0.5);
    });
  });

  describe('files with no tokens', () => {
    it('returns 0 when file name produces no tokens', () => {
      expect(pathRedundancy('src/.ts', ['src'])).toBe(0);
      expect(pathRedundancy('src/---', ['src'])).toBe(0);
    });
  });

  describe('real-world examples', () => {
    it('analyzes utils modules', () => {
      // arrayUtils.ts in utils folder
      // tokens: ['array', 'utils']
      // ancestors: ['utils']
      // shared: 1/2 = 0.5
      expect(pathRedundancy('utils/arrayUtils.ts', ['utils'])).toBe(0.5);
    });

    it('analyzes type files', () => {
      // scrapTypes.ts in scrap folder
      // tokens: ['scrap', 'types']
      // ancestors: ['scrap']
      // shared: 1/2 = 0.5
      expect(pathRedundancy('scrap/scrapTypes.ts', ['scrap'])).toBe(0.5);
    });

    it('analyzes nested module structures', () => {
      // userService.ts in services/user
      // tokens: ['user', 'service']
      // ancestors: ['services', 'user']
      // shared: 1/2 = 0.5
      expect(pathRedundancy('services/user/userService.ts', ['services', 'user'])).toBe(0.5);
    });

    it('analyzes deeply nested paths', () => {
      // config.ts in src/config/app
      // tokens: ['config']
      // ancestors: ['src', 'config', 'app']
      // shared: 1/1 = 1.0
      expect(pathRedundancy('src/config/app/config.ts', ['src', 'config', 'app'])).toBe(1.0);
    });
  });
});
