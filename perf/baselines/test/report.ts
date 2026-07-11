import type { PerfReport } from '../../report';

export function createPerfReport(): PerfReport {
  return {
    schemaVersion: 1,
    fixture: 'small',
    variant: 'default',
    runner: {
      os: 'linux',
      arch: 'x64',
      cpuModel: 'CI CPU',
      nodeVersion: 'v22.22.0',
      vscodeVersion: '1.128.0',
      runnerClass: 'linux-x64',
    },
    metrics: {
      coldOpenMs: 1_000,
      warmOpenMs: 500,
      incrementalRefreshMs: {
        save: 10,
        rename: 20,
        create: 30,
        delete: 40,
        batch100: 50,
      },
      payloadBytes: 2_048,
      watcherToGraphMs: {
        save: 11,
        rename: 21,
        create: 31,
        delete: 41,
        batch100: 51,
      },
      fileOpRoundtripMs: {
        rename: 25,
        create: 35,
        delete: 45,
        reveal: 15,
      },
      layoutResets: 1,
      cacheSaveMs: 12,
      cacheBytes: 4_096,
      treeSitterParseMs: 120,
      graphBuildMs: 180,
      pluginActivationMs: {
        'codegraphy.markdown': 12,
      },
      scopeToggleMs: { files: 8 },
      settleTimeMs: 300,
      idleCpuPct: 0.5,
      simTicksAfterSettle: 0,
    },
    webview: {
      fpsIdle: 60,
      fpsDrag: 58,
      fpsSettle: 55,
      longTasksPerInteraction: 0,
      heapUsedBytes: 1_048_576,
    },
    explorer: {
      explorerRenameMs: 20,
      explorerCreateMs: 30,
      explorerDeleteMs: 40,
      explorerRevealMs: 10,
    },
    ratios: {
      renameRatio: 1.25,
      createRatio: 1.17,
      deleteRatio: 1.13,
      revealRatio: 1.5,
    },
  };
}
