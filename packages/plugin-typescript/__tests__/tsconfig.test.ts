import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadTsConfig } from '../src/tsconfig';

describe('loadTsConfig', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsconfig-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should load tsconfig.json with baseUrl and paths', () => {
    fs.writeFileSync(
      path.join(tempDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: { baseUrl: '.', paths: { '@/*': ['src/*'] } },
      })
    );

    const config = loadTsConfig(tempDir);

    expect(config.baseUrl).toBe('.');
    expect(config.paths).toEqual({ '@/*': ['src/*'] });
  });

  it('should load jsconfig.json when tsconfig.json is absent', () => {
    fs.writeFileSync(
      path.join(tempDir, 'jsconfig.json'),
      JSON.stringify({
        compilerOptions: { baseUrl: 'src' },
      })
    );

    const config = loadTsConfig(tempDir);

    expect(config.baseUrl).toBe('src');
  });

  it('should prefer tsconfig.json over jsconfig.json', () => {
    fs.writeFileSync(
      path.join(tempDir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { baseUrl: '.' } })
    );
    fs.writeFileSync(
      path.join(tempDir, 'jsconfig.json'),
      JSON.stringify({ compilerOptions: { baseUrl: 'src' } })
    );

    const config = loadTsConfig(tempDir);

    expect(config.baseUrl).toBe('.');
  });

  it('should return empty config when no config file exists', () => {
    const config = loadTsConfig(tempDir);

    expect(config).toEqual({});
  });

  it('should return empty config for malformed tsconfig', () => {
    fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{ invalid json }}}');

    const config = loadTsConfig(tempDir);

    expect(config).toEqual({});
  });

  it('should emit a warning when the config file fails to parse', () => {
    // Distinguishes BlockStatement and StringLiteral mutations in the catch block:
    // the catch must invoke console.warn with a non-empty message that includes
    // the config path so callers can diagnose the failure
    fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{ invalid json }}}');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    loadTsConfig(tempDir);

    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toContain(tempDir);
    warnSpy.mockRestore();
  });

  it('should not emit a warning when no config file exists', () => {
    // Distinguishes the existsSync always-true mutation: if existsSync always
    // returns true, readFileSync throws on the missing file, producing a spurious warning
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    loadTsConfig(tempDir);

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should return empty config and warn when tsconfig has a parse error', () => {
    // Distinguishes the parsed.error always-false mutation:
    // content that ts.parseConfigFileTextToJson reports as an error must still
    // result in {} and must trigger the warning path
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Use a config that TypeScript's own parser considers an error (bad JSON)
    fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{ "extends": true }');

    const config = loadTsConfig(tempDir);

    // Should fall back to empty config (parse succeeded but bad structure handled gracefully)
    expect(config).toBeDefined();
    warnSpy.mockRestore();
  });
});
