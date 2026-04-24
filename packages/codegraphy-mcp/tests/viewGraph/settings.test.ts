import * as fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readViewGraphSettings } from '../../src/viewGraph/settings';
import { createTempCodeGraphyHome, createTempRepo, writeRepoSettings } from '../support/database';

describe('viewGraph/settings', () => {
  let homePath: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    originalHome = process.env.CODEGRAPHY_HOME;
    homePath = createTempCodeGraphyHome();
    process.env.CODEGRAPHY_HOME = homePath;
  });

  afterEach(() => {
    process.env.CODEGRAPHY_HOME = originalHome;
    fs.rmSync(homePath, { recursive: true, force: true });
  });

  it('reads folder, package, depth, and orphan settings from the saved repo settings file', () => {
    const repo = createTempRepo();
    writeRepoSettings(repo, {
      showOrphans: false,
      depthMode: true,
      depthLimit: 3,
      nodeVisibility: {
        folder: true,
        package: true,
      },
    });

    const settings = readViewGraphSettings(repo.workspaceRoot);

    expect(settings).toEqual({
      depthMode: true,
      depthLimit: 3,
      includeFolders: true,
      includePackages: true,
      showOrphans: false,
    });
  });

  it('lets explicit query options override the saved repo settings', () => {
    const repo = createTempRepo();
    writeRepoSettings(repo, {
      showOrphans: false,
      depthMode: true,
      depthLimit: 4,
      nodeVisibility: {
        folder: false,
        package: false,
      },
    });

    const settings = readViewGraphSettings(repo.workspaceRoot, {
      showOrphans: true,
      depthMode: false,
      includeFolders: true,
      includePackages: true,
      depthLimit: 1,
    });

    expect(settings).toEqual({
      depthMode: false,
      depthLimit: 1,
      includeFolders: true,
      includePackages: true,
      showOrphans: true,
    });
  });
});
