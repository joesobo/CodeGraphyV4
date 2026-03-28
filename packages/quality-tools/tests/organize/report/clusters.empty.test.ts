import { describe, expect, it } from 'vitest';
import { clusterLines } from '../../../src/organize/report/clusters';
import type { OrganizeCohesionCluster } from '../../../src/organize/types';

describe('clusterLines - empty and single', () => {
  it('returns empty array when no clusters', () => {
    const lines = clusterLines([], 'src/scrap/');
    expect(lines).toEqual([]);
  });

  it('formats single cluster correctly', () => {
    const clusters: OrganizeCohesionCluster[] = [
      {
        prefix: 'report',
        memberCount: 8,
        members: [],
        suggestedFolder: 'src/scrap/report/',
        confidence: 'prefix+imports'
      }
    ];

    const lines = clusterLines(clusters, 'src/scrap/');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Clusters:');
    expect(lines[0]).toContain('report');
    expect(lines[0]).toContain('8 files');
    expect(lines[0]).toContain('prefix+imports');
    expect(lines[0]).toContain('src/scrap/report/');
  });

  it('includes all cluster information', () => {
    const clusters: OrganizeCohesionCluster[] = [
      {
        prefix: 'test',
        memberCount: 5,
        members: [],
        suggestedFolder: 'src/test/',
        confidence: 'imports-only'
      }
    ];

    const lines = clusterLines(clusters, 'src/');

    expect(lines[0]).toContain('test');
    expect(lines[0]).toContain('5 files');
    expect(lines[0]).toContain('imports-only');
    expect(lines[0]).toContain('→ suggest');
    expect(lines[0]).toContain('src/test/');
  });

  it('builds suggested path from directory path and prefix', () => {
    const clusters: OrganizeCohesionCluster[] = [
      {
        prefix: 'utils',
        memberCount: 3,
        members: [],
        suggestedFolder: 'irrelevant',
        confidence: 'prefix-only'
      }
    ];

    const directoryPath = 'packages/core/src/helpers/';
    const lines = clusterLines(clusters, directoryPath);

    expect(lines[0]).toContain('packages/core/src/helpers/utils/');
  });

  it('handles different confidence levels', () => {
    const clusters: OrganizeCohesionCluster[] = [
      {
        prefix: 'a',
        memberCount: 2,
        members: [],
        suggestedFolder: '',
        confidence: 'imports-only'
      },
      {
        prefix: 'b',
        memberCount: 2,
        members: [],
        suggestedFolder: '',
        confidence: 'prefix+imports'
      },
      {
        prefix: 'c',
        memberCount: 2,
        members: [],
        suggestedFolder: '',
        confidence: 'prefix-only'
      }
    ];

    const lines = clusterLines(clusters, 'src/');

    expect(lines[0]).toContain('imports-only');
    expect(lines[1]).toContain('prefix+imports');
    expect(lines[2]).toContain('prefix-only');
  });

  it('returns truly empty array when clusters array is empty', () => {
    const lines = clusterLines([], 'src/test/');
    expect(lines).toEqual([]);
    expect(lines.length).toBe(0);
  });

  it('returns empty array with no side effects when clusters are empty', () => {
    const emptyArray: OrganizeCohesionCluster[] = [];
    const result1 = clusterLines(emptyArray, 'src/');
    const result2 = clusterLines(emptyArray, 'src/another/');

    expect(result1).toEqual([]);
    expect(result2).toEqual([]);
  });

  it('includes exact member count in output', () => {
    const clusters: OrganizeCohesionCluster[] = [
      {
        prefix: 'service',
        memberCount: 42,
        members: [],
        suggestedFolder: '',
        confidence: 'prefix+imports'
      }
    ];

    const lines = clusterLines(clusters, 'src/');
    expect(lines[0]).toContain('42 files');
  });
});
