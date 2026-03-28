import { describe, expect, it } from 'vitest';
import { tokenize } from '../../src/organize/tokenize';

describe('tokenize', () => {
  describe('camelCase', () => {
    it('splits camelCase identifiers', () => {
      expect(tokenize('reportBlocks')).toEqual(['report', 'blocks']);
      expect(tokenize('myVariable')).toEqual(['my', 'variable']);
      expect(tokenize('getValue')).toEqual(['get', 'value']);
    });

    it('handles single word', () => {
      expect(tokenize('report')).toEqual(['report']);
    });

    it('handles multiple camelCase boundaries', () => {
      expect(tokenize('getReportBlocksData')).toEqual(['get', 'report', 'blocks', 'data']);
    });
  });

  describe('PascalCase', () => {
    it('splits PascalCase identifiers', () => {
      expect(tokenize('ReportBlocks')).toEqual(['report', 'blocks']);
      expect(tokenize('MyVariable')).toEqual(['my', 'variable']);
    });

    it('handles single PascalCase word', () => {
      expect(tokenize('Report')).toEqual(['report']);
    });

    it('handles multiple PascalCase boundaries', () => {
      expect(tokenize('GetReportBlocksData')).toEqual(['get', 'report', 'blocks', 'data']);
    });
  });

  describe('Acronyms', () => {
    it('splits acronyms followed by camelCase', () => {
      expect(tokenize('HTMLParser')).toEqual(['html', 'parser']);
      expect(tokenize('XMLHttpRequest')).toEqual(['xml', 'http', 'request']);
    });

    it('splits acronyms at the end after camelCase', () => {
      expect(tokenize('parseJSON')).toEqual(['parse', 'json']);
      expect(tokenize('buildURL')).toEqual(['build', 'url']);
    });

    it('handles all uppercase acronyms', () => {
      expect(tokenize('HTML')).toEqual(['html']);
      expect(tokenize('API')).toEqual(['api']);
    });

    it('handles mixed acronyms and camelCase', () => {
      expect(tokenize('parseHTMLToXML')).toEqual(['parse', 'html', 'to', 'xml']);
    });
  });

  describe('kebab-case', () => {
    it('splits kebab-case identifiers', () => {
      expect(tokenize('report-blocks')).toEqual(['report', 'blocks']);
      expect(tokenize('my-variable-name')).toEqual(['my', 'variable', 'name']);
    });
  });

  describe('snake_case', () => {
    it('splits snake_case identifiers', () => {
      expect(tokenize('report_blocks')).toEqual(['report', 'blocks']);
      expect(tokenize('my_variable_name')).toEqual(['my', 'variable', 'name']);
    });
  });

  describe('dot-separated', () => {
    it('splits dot-separated names', () => {
      expect(tokenize('report.blocks')).toEqual(['report', 'blocks']);
      expect(tokenize('my.variable.name')).toEqual(['my', 'variable', 'name']);
    });
  });

  describe('mixed separators', () => {
    it('handles mixed separators and camelCase', () => {
      expect(tokenize('myHTMLParser-v2')).toEqual(['my', 'html', 'parser', 'v', '2']);
      expect(tokenize('report_blocks.data')).toEqual(['report', 'blocks', 'data']);
      expect(tokenize('MyReport-DataBlocks_v1')).toEqual(['my', 'report', 'data', 'blocks', 'v', '1']);
    });
  });

  describe('file extensions', () => {
    it('strips TypeScript extensions', () => {
      expect(tokenize('reportBlocks.ts')).toEqual(['report', 'blocks']);
      expect(tokenize('reportBlocks.tsx')).toEqual(['report', 'blocks']);
    });

    it('strips JavaScript extensions', () => {
      expect(tokenize('reportBlocks.js')).toEqual(['report', 'blocks']);
      expect(tokenize('reportBlocks.jsx')).toEqual(['report', 'blocks']);
    });

    it('strips test extensions', () => {
      expect(tokenize('reportBlocks.test.ts')).toEqual(['report', 'blocks']);
      expect(tokenize('reportBlocks.test.tsx')).toEqual(['report', 'blocks']);
      expect(tokenize('reportBlocks.spec.ts')).toEqual(['report', 'blocks']);
      expect(tokenize('reportBlocks.spec.tsx')).toEqual(['report', 'blocks']);
    });

    it('handles file names with dots in tokenization', () => {
      expect(tokenize('report.blocks.ts')).toEqual(['report', 'blocks']);
    });
  });

  describe('case sensitivity', () => {
    it('returns all tokens in lowercase', () => {
      expect(tokenize('ReportBlocks')).toEqual(['report', 'blocks']);
      expect(tokenize('ALLUPPERCASE')).toEqual(['alluppercase']);
      expect(tokenize('HTMLParser')).toEqual(['html', 'parser']);
    });
  });

  describe('single character tokens', () => {
    it('keeps single character tokens', () => {
      expect(tokenize('aReport')).toEqual(['a', 'report']);
      expect(tokenize('v2')).toEqual(['v', '2']); // Split on digit boundary
      expect(tokenize('myA')).toEqual(['my', 'a']);
    });
  });

  describe('empty and edge cases', () => {
    it('returns empty array for empty string', () => {
      expect(tokenize('')).toEqual([]);
    });

    it('returns empty array for extension only', () => {
      expect(tokenize('.ts')).toEqual([]);
      expect(tokenize('.test.ts')).toEqual([]);
    });

    it('returns empty array for separators only', () => {
      expect(tokenize('---')).toEqual([]);
      expect(tokenize('___')).toEqual([]);
      expect(tokenize('...')).toEqual([]);
    });

    it('ignores multiple consecutive separators', () => {
      expect(tokenize('report--blocks')).toEqual(['report', 'blocks']);
      expect(tokenize('report__blocks')).toEqual(['report', 'blocks']);
    });
  });

  describe('real-world examples', () => {
    it('tokenizes common file names', () => {
      expect(tokenize('index.ts')).toEqual(['index']);
      expect(tokenize('README.md')).toEqual(['readme', 'md']);
      expect(tokenize('package.json')).toEqual(['package', 'json']);
    });

    it('tokenizes complex module names', () => {
      expect(tokenize('useCustomHookV2.ts')).toEqual(['use', 'custom', 'hook', 'v', '2']);
      expect(tokenize('myHTMLRenderer.tsx')).toEqual(['my', 'html', 'renderer']);
      expect(tokenize('JSON_Parser.js')).toEqual(['json', 'parser']);
    });

    it('tokenizes folder names', () => {
      expect(tokenize('node_modules')).toEqual(['node', 'modules']);
      expect(tokenize('src')).toEqual(['src']);
      expect(tokenize('APIv3')).toEqual(['ap', 'iv', '3']); // Acronym then v then digit
    });
  });

  describe('acronym boundary regex mutations', () => {
    it('handles XMLParser correctly with acronym boundary', () => {
      expect(tokenize('XMLParser')).toEqual(['xml', 'parser']);
    });

    it('handles HTMLElement correctly', () => {
      expect(tokenize('HTMLElement')).toEqual(['html', 'element']);
    });

    it('handles XMLHttpRequest with multiple acronyms', () => {
      expect(tokenize('XMLHttpRequest')).toEqual(['xml', 'http', 'request']);
    });
  });

  describe('digit boundary regex mutations', () => {
    it('handles 2fast with digit-to-letter boundary', () => {
      expect(tokenize('2fast')).toEqual(['2', 'fast']);
    });

    it('handles v2release with letter-to-digit and digit-to-letter', () => {
      expect(tokenize('v2release')).toEqual(['v', '2', 'release']);
    });

    it('handles file2Open with digit boundaries', () => {
      expect(tokenize('file2Open')).toEqual(['file', '2', 'open']);
    });
  });

  describe('whitespace split regex mutations', () => {
    it('handles multiple spaces in separated names', () => {
      expect(tokenize('report  blocks')).toEqual(['report', 'blocks']);
    });

    it('handles mixed whitespace in complex names', () => {
      expect(tokenize('report\tblocks')).toEqual(['report', 'blocks']);
    });
  });
});
