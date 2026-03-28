import { describe, expect, it, afterEach } from 'vitest';
import { analyze } from '../../src/organize/analyze';
import { cleanupTempDirs, createTarget, createFileTree } from './testHelpers';

const tempDirs: string[] = [];

afterEach(() => {
  cleanupTempDirs(tempDirs);
});

describe('analyze - file issues and advanced scenarios', () => {
  it('detects low-info name issues', () => {
    const root = createFileTree(
      {
        'utils.ts': 'export const helper = () => {};',
        'helpers.ts': 'export const help = () => {};',
        'regular.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);

    expect(result[0]?.fileIssues).toHaveLength(2);
    const issues = result[0]!.fileIssues;
    expect(issues.some((issue) => issue.fileName === 'utils.ts' && issue.kind === 'low-info-banned')).toBe(true);
    expect(issues.some((issue) => issue.fileName === 'helpers.ts' && issue.kind === 'low-info-banned')).toBe(true);
  });

  it('detects barrel files', () => {
    const root = createFileTree(
      {
        'module.ts': 'export { x } from "./alpha";\nexport { y } from "./beta";\nexport { z } from "./gamma";',
        'alpha.ts': 'export const x = 1;',
        'beta.ts': 'export const y = 2;',
        'gamma.ts': 'export const z = 3;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);

    const issues = result[0]!.fileIssues;
    expect(issues.some((issue) => issue.fileName === 'module.ts' && issue.kind === 'barrel')).toBe(true);
  });

  it('calculates path redundancy for files with redundant names', () => {
    const root = createFileTree(
      {
        'src/srcModule.ts': 'export const x = 1;',
        'src/utils.ts': 'export const y = 2;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);

    const srcMetric = result.find((metric) => metric.directoryPath === 'src');
    expect(srcMetric).toBeDefined();
    expect(srcMetric!.averageRedundancy).toBeGreaterThan(0);
  });

  it('finds cohesion clusters for files with shared prefix', () => {
    const root = createFileTree(
      {
        'userModel.ts': 'export interface User {}',
        'userService.ts': 'import "./userModel"; export class UserService {}',
        'userController.ts': 'import "./userService"; export class UserController {}',
        'other.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);

    const clusters = result[0]!.clusters;
    expect(clusters.length).toBeGreaterThan(0);
    const userCluster = clusters.find((cluster) => cluster.prefix === 'user');
    expect(userCluster).toBeDefined();
    expect(userCluster?.memberCount).toBe(3);
  });

  it('assigns DEEP verdict for deeply nested directories', () => {
    const root = createFileTree(
      {
        'a/b/c/d/e/deep.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);

    const deepMetric = result.find((metric) => metric.directoryPath === 'a/b/c/d/e');
    expect(deepMetric?.depth).toBe(5);
    expect(deepMetric?.depthVerdict).toBe('DEEP');
  });

  it('flags files with redundant names as file issues', () => {
    const root = createFileTree(
      {
        'scrap/scrapTypes.ts': 'export type X = string;',
        'scrap/analyze.ts': 'export const x = 1;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);

    const scrapMetric = result.find((metric) => metric.directoryPath === 'scrap');
    expect(scrapMetric).toBeDefined();
    const redundancyIssues = scrapMetric!.fileIssues.filter((issue) => issue.kind === 'redundancy');
    expect(redundancyIssues).toHaveLength(1);
    expect(redundancyIssues[0]?.fileName).toBe('scrapTypes.ts');
    expect(redundancyIssues[0]?.redundancyScore).toBe(0.5);
  });

  it('does not flag files below redundancy threshold', () => {
    const root = createFileTree(
      {
        'scrap/analyze.ts': 'export const x = 1;',
        'scrap/report.ts': 'export const y = 2;'
      },
      tempDirs
    );
    const target = createTarget(root);

    const result = analyze(target);

    const scrapMetric = result.find((metric) => metric.directoryPath === 'scrap');
    expect(scrapMetric).toBeDefined();
    const redundancyIssues = scrapMetric!.fileIssues.filter((issue) => issue.kind === 'redundancy');
    expect(redundancyIssues).toHaveLength(0);
  });
});
