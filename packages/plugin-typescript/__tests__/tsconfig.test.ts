import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
});
