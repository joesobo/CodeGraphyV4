import { describe, expect, it } from 'vitest';
import { clusterLines } from '../../src/organize/reportClusters';
import type { OrganizeCohesionCluster } from '../../src/organize/organizeTypes';

describe('clusterLines', () => {
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

  it('formats multiple clusters with proper indentation', () => {
    const clusters: OrganizeCohesionCluster[] = [
      {
        prefix: 'report',
        memberCount: 8,
        members: [],
        suggestedFolder: 'src/scrap/report/',
        confidence: 'prefix+imports'
      },
      {
        prefix: 'example',
        memberCount: 7,
        members: [],
        suggestedFolder: 'src/scrap/example/',
        confidence: 'prefix+imports'
      },
      {
        prefix: 'baseline',
        memberCount: 3,
        members: [],
        suggestedFolder: 'src/scrap/baseline/',
        confidence: 'prefix-only'
      }
    ];

    const lines = clusterLines(clusters, 'src/scrap/');

    expect(lines).toHaveLength(3);

    // First line should have "Clusters:" label
    expect(lines[0]).toContain('Clusters:');
    expect(lines[0]).toContain('report');

    // Second and third lines should be indented to align with first cluster name
    expect(lines[1]).not.toContain('Clusters:');
    expect(lines[1]).toContain('example');
    expect(lines[2]).not.toContain('Clusters:');
    expect(lines[2]).toContain('baseline');

    // Check indentation alignment
    const firstLineClusterStart = lines[0].indexOf('report');
    const secondLineClusterStart = lines[1].indexOf('example');
    expect(firstLineClusterStart).toBe(secondLineClusterStart);
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
});
