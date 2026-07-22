import { describe, expect, it } from 'vitest';
import { createDoctorCacheCheck } from '../../../../src/cli/doctor/cacheCheck/model';

const records = { indexedFiles: 2, nodes: 3, symbols: 1, edges: 1 };

describe('cli doctor cache check', () => {
  it('reports every cache health dimension for a fresh healthy cache', () => {
    expect(createDoctorCacheCheck({
      status: {
        state: 'fresh',
        graphCachePath: '.codegraphy/graph.sqlite',
        staleReasons: [],
      },
      inspection: {
        ok: true,
        schemaVersion: 9,
        expectedSchemaVersion: 9,
        schemaCompatible: true,
        integrityOk: true,
        foreignKeyOk: true,
        records,
      },
      indexedAt: '2026-07-21T00:00:00.000Z',
    })).toEqual({
      ok: true,
      state: 'fresh',
      path: '.codegraphy/graph.sqlite',
      staleReasons: [],
      schemaVersion: 9,
      expectedSchemaVersion: 9,
      schemaCompatible: true,
      integrityOk: true,
      foreignKeyOk: true,
      analysisVersion: '2.3.0',
      indexedAt: '2026-07-21T00:00:00.000Z',
      records,
    });
  });

  it('keeps the inspection message and adds recovery for an unhealthy cache', () => {
    expect(createDoctorCacheCheck({
      status: {
        state: 'stale',
        graphCachePath: '.codegraphy/graph.sqlite',
        staleReasons: ['settings-signature-changed'],
      },
      inspection: {
        ok: false,
        schemaVersion: 9,
        expectedSchemaVersion: 9,
        schemaCompatible: true,
        integrityOk: true,
        foreignKeyOk: false,
        records,
        message: 'Graph Cache integrity check failed.',
      },
      indexedAt: null,
    })).toEqual({
      ok: false,
      state: 'stale',
      path: '.codegraphy/graph.sqlite',
      staleReasons: ['settings-signature-changed'],
      schemaVersion: 9,
      expectedSchemaVersion: 9,
      schemaCompatible: true,
      integrityOk: true,
      foreignKeyOk: false,
      analysisVersion: '2.3.0',
      indexedAt: null,
      records,
      message: 'Graph Cache integrity check failed.',
      action: 'Run `codegraphy index`.',
    });
  });

  it('requires both fresh status and a healthy inspection', () => {
    const input = {
      status: {
        state: 'fresh' as const,
        graphCachePath: '.codegraphy/graph.sqlite',
        staleReasons: [],
      },
      inspection: {
        ok: false,
        schemaVersion: 9,
        expectedSchemaVersion: 9,
        schemaCompatible: true,
        integrityOk: false,
        foreignKeyOk: true,
        records,
      },
      indexedAt: null,
    };

    expect(createDoctorCacheCheck(input)).toMatchObject({
      ok: false,
      action: 'Run `codegraphy index`.',
    });
  });
});
