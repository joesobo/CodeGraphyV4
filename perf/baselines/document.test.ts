import { describe, expect, it } from 'vitest';

import {
  mergePerfBaselineReports,
  parsePerfBaselineDocument,
  selectPerfBaselineReport,
} from './document';
import { createPerfReport } from './test/report';

describe('performance baseline documents', () => {
  it('parses a keyed runner-class baseline', () => {
    const report = createPerfReport();
    const document = {
      schemaVersion: 1,
      runnerClass: 'linux-x64',
      reports: { 'small:default': report },
    };

    expect(parsePerfBaselineDocument(document)).toEqual(document);
  });

  it('rejects a baseline report with a missing report key', () => {
    const incomplete = structuredClone(createPerfReport()) as unknown as {
      metrics: { coldOpenMs?: number };
    };
    delete incomplete.metrics.coldOpenMs;

    expect(() => parsePerfBaselineDocument({
      schemaVersion: 1,
      runnerClass: 'linux-x64',
      reports: { 'small:default': incomplete },
    })).toThrow(/coldOpenMs/);
  });

  it('selects the baseline from the current runner class', () => {
    const linuxReport = createPerfReport();
    const localReport = createPerfReport();
    localReport.runner.runnerClass = 'local-reference';
    localReport.runner.os = 'darwin';
    localReport.runner.arch = 'arm64';

    expect(selectPerfBaselineReport([
      {
        schemaVersion: 1,
        runnerClass: 'local-reference',
        reports: { 'small:default': localReport },
      },
      {
        schemaVersion: 1,
        runnerClass: 'linux-x64',
        reports: { 'small:default': linuxReport },
      },
    ], linuxReport)).toEqual(linuxReport);
  });

  it('fails clearly when the current runner class has no baseline', () => {
    const report = createPerfReport();

    expect(() => selectPerfBaselineReport([], report)).toThrow(
      'Missing baseline document for runner class linux-x64',
    );
  });

  it('fails clearly when the fixture report key has no baseline', () => {
    const current = createPerfReport();
    const medium = createPerfReport();
    medium.fixture = 'medium';

    expect(() => selectPerfBaselineReport([{
      schemaVersion: 1,
      runnerClass: 'linux-x64',
      reports: { 'medium:default': medium },
    }], current)).toThrow(
      'Missing baseline report small:default for runner class linux-x64',
    );
  });

  it('creates a deterministically keyed baseline document from reports', () => {
    const small = createPerfReport();
    const medium = createPerfReport();
    medium.fixture = 'medium';

    expect(mergePerfBaselineReports(undefined, [medium, small])).toEqual({
      schemaVersion: 1,
      runnerClass: 'linux-x64',
      reports: {
        'medium:default': medium,
        'small:default': small,
      },
    });
  });

  it('merges new medians and replaces the same fixture without dropping others', () => {
    const originalSmall = createPerfReport();
    const medium = createPerfReport();
    medium.fixture = 'medium';
    const replacementSmall = structuredClone(originalSmall);
    replacementSmall.metrics.coldOpenMs = 1_234;
    const existing = mergePerfBaselineReports(undefined, [originalSmall, medium]);

    expect(mergePerfBaselineReports(existing, [replacementSmall])).toEqual({
      ...existing,
      reports: {
        'medium:default': medium,
        'small:default': replacementSmall,
      },
    });
  });

  it('rejects duplicate fixture variants in one adoption', () => {
    const first = createPerfReport();
    const duplicate = structuredClone(first);

    expect(() => mergePerfBaselineReports(undefined, [first, duplicate]))
      .toThrow('Duplicate baseline report input small:default');
  });

  it('rejects reports from mixed runner classes', () => {
    const linux = createPerfReport();
    const local = createPerfReport();
    local.fixture = 'medium';
    local.runner.runnerClass = 'local-reference';

    expect(() => mergePerfBaselineReports(undefined, [linux, local]))
      .toThrow('Baseline reports must use one runner class');
  });

  it('rejects merging into a different runner class', () => {
    const linux = createPerfReport();
    const local = createPerfReport();
    local.runner.runnerClass = 'local-reference';
    const existing = mergePerfBaselineReports(undefined, [linux]);

    expect(() => mergePerfBaselineReports(existing, [local]))
      .toThrow('Cannot merge local-reference reports into linux-x64 baseline');
  });
});
