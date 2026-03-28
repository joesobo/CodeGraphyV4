import { describe, expect, it } from 'vitest';
import { clusterLines } from '../../../src/organize/report/clusters';
import { createClusters } from '../testHelpers';

describe('clusterLines - formatting', () => {
  it('formats multiple clusters with proper indentation', () => {
    const clusters = createClusters([
      { prefix: 'report', memberCount: 8, confidence: 'prefix+imports' },
      { prefix: 'example', memberCount: 7, confidence: 'prefix+imports' },
      { prefix: 'baseline', memberCount: 3, confidence: 'prefix-only' }
    ]);

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

  it('properly formats directory path when it ends with slash', () => {
    const clusters = createClusters([
      { prefix: 'report', memberCount: 5, confidence: 'prefix+imports' }
    ]);

    const lines = clusterLines(clusters, 'src/app/');
    expect(lines[0]).toContain('src/app/report/');
  });

  it('properly formats directory path when it does not end with slash', () => {
    const clusters = createClusters([
      { prefix: 'report', memberCount: 5, confidence: 'prefix+imports' }
    ]);

    const lines = clusterLines(clusters, 'src/app');
    expect(lines[0]).toContain('src/app/report/');
  });

  it('formats cluster suggestion arrow correctly', () => {
    const clusters = createClusters([
      { prefix: 'utils', memberCount: 3, confidence: 'prefix-only' }
    ]);

    const lines = clusterLines(clusters, 'src/');
    expect(lines[0]).toContain('→ suggest');
  });

  it('includes exact prefix in output', () => {
    const clusters = createClusters([
      { prefix: 'customPrefix123', memberCount: 5, confidence: 'prefix-only' }
    ]);

    const lines = clusterLines(clusters, 'src/');
    expect(lines[0]).toContain('customPrefix123');
  });

  it('preserves exact confidence string in output', () => {
    const clusters = createClusters([
      { prefix: 'test', memberCount: 3, confidence: 'prefix-only' }
    ]);

    const lines = clusterLines(clusters, 'src/');
    expect(lines[0]).toContain('prefix-only');
    expect(lines[0]).not.toContain('prefix+imports');
  });

  it('maintains consistent indentation for alignment across clusters', () => {
    const clusters = createClusters([
      { prefix: 'first', memberCount: 3, confidence: 'prefix+imports' },
      { prefix: 'second', memberCount: 4, confidence: 'prefix-only' }
    ]);

    const lines = clusterLines(clusters, 'src/');

    const firstPrefix = lines[0].indexOf('first');
    const secondPrefix = lines[1].indexOf('second');

    expect(firstPrefix).toBe(secondPrefix);
  });
});
