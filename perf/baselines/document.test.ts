import { describe, expect, it } from 'vitest';

import {
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
});
