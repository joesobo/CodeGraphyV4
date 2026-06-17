export type E2EScenarioName = 'typescript' | 'godot' | 'codegraphy-root';

interface DepthExpectation {
  rootFileRelativePath: string;
  depthOneNodeIds: string[];
  depthOneEdgeIds: string[];
  depthTwoNodeIds: string[];
  excludedAtDepthTwo: string[];
  selectedNodeId: string;
  selectedNodeDepthOneNodeIds: string[];
  selectedNodeDepthOneEdgeIds: string[];
  rerootNodeId: string;
  rerootDepthOneNodeIds: string[];
  rerootDepthOneEdgeIds: string[];
}

export interface E2EScenario {
  name: E2EScenarioName;
  workspaceRelativePath: string;
  pluginDevelopmentRelativePaths: string[];
  workspacePluginPackageRelativePaths: string[];
  runByDefault?: boolean;
  preserveWorkspaceCodegraphy?: boolean;
  writeWorkspaceSettings?: boolean;
  graphNodeExtension: string;
  expectedNodeIds: string[];
  minimumExpectedEdgeIds: string[];
  primaryFileRelativePath: string;
  tempFileRelativePath: string;
  tempFileContents: string;
  saveTriggerText: string;
  depth: DepthExpectation;
}

export const e2eScenarios: E2EScenario[] = [
  {
    name: 'codegraphy-root',
    workspaceRelativePath: '.',
    pluginDevelopmentRelativePaths: [],
    workspacePluginPackageRelativePaths: [],
    runByDefault: false,
    preserveWorkspaceCodegraphy: true,
    writeWorkspaceSettings: false,
    graphNodeExtension: '.ts',
    expectedNodeIds: [
      'packages/extension/src/e2e/suite/graph.test.ts',
    ],
    minimumExpectedEdgeIds: [],
    primaryFileRelativePath: 'packages/extension/src/e2e/suite/graph.test.ts',
    tempFileRelativePath: 'packages/extension/src/e2e/suite/__e2e_temp__.ts',
    tempFileContents: 'export const e2eTemp = true;\n',
    saveTriggerText: '\n// e2e save trigger',
    depth: {
      rootFileRelativePath: 'packages/extension/src/e2e/suite/graph.test.ts',
      depthOneNodeIds: [],
      depthOneEdgeIds: [],
      depthTwoNodeIds: [],
      excludedAtDepthTwo: [],
      selectedNodeId: 'packages/extension/src/e2e/suite/graph.test.ts',
      selectedNodeDepthOneNodeIds: [],
      selectedNodeDepthOneEdgeIds: [],
      rerootNodeId: 'packages/extension/src/e2e/suite/graph.test.ts',
      rerootDepthOneNodeIds: [],
      rerootDepthOneEdgeIds: [],
    },
  },
  {
    name: 'typescript',
    workspaceRelativePath: 'examples/example-typescript',
    pluginDevelopmentRelativePaths: [],
    workspacePluginPackageRelativePaths: [
      'packages/plugin-typescript',
      'packages/extension/src/e2e/fixtures/package-graph-view-plugin',
    ],
    graphNodeExtension: '.ts',
    expectedNodeIds: [
      'src/index.ts',
      'src/utils.ts',
      'src/types.ts',
    ],
    minimumExpectedEdgeIds: [
      'src/index.ts->src/utils.ts#import',
      'src/index.ts->src/types.ts#import',
      'src/index.ts->src/alias/notification.ts#codegraphy.typescript:alias-import',
    ],
    primaryFileRelativePath: 'src/index.ts',
    tempFileRelativePath: 'src/__e2e_temp__.ts',
    tempFileContents: 'export const e2eTemp = true;\n',
    saveTriggerText: '\n// e2e save trigger',
    depth: {
      rootFileRelativePath: 'src/index.ts',
      depthOneNodeIds: [
        'src/alias/notification.ts',
        'src/index.ts',
        'src/lazyAudit.ts',
        'src/legacySettings.ts',
        'src/registry.ts',
        'src/stageLabels.ts',
        'src/utils.ts',
        'src/types.ts',
      ],
      depthOneEdgeIds: [
        'src/index.ts->src/alias/notification.ts#codegraphy.typescript:alias-import',
        'src/index.ts->src/lazyAudit.ts#import',
        'src/index.ts->src/legacySettings.ts#import',
        'src/index.ts->src/registry.ts#import',
        'src/index.ts->src/stageLabels.ts#call',
        'src/index.ts->src/stageLabels.ts#import',
        'src/index.ts->src/utils.ts#call',
        'src/index.ts->src/utils.ts#import',
        'src/index.ts->src/types.ts#call',
        'src/index.ts->src/types.ts#import',
        'src/index.ts->src/types.ts#type-import',
      ],
      depthTwoNodeIds: [
        'src/alias/notification.ts',
        'src/checklist.ts',
        'src/index.ts',
        'src/lazyAudit.ts',
        'src/legacySettings.ts',
        'src/registry.ts',
        'src/stageLabels.ts',
        'src/summary.ts',
        'src/utils.ts',
        'src/types.ts',
      ],
      excludedAtDepthTwo: ['src/orphan.ts'],
      selectedNodeId: 'src/orphan.ts',
      selectedNodeDepthOneNodeIds: ['src/orphan.ts'],
      selectedNodeDepthOneEdgeIds: [],
      rerootNodeId: 'src/utils.ts',
      rerootDepthOneNodeIds: [
        'src/index.ts',
        'src/utils.ts',
        'src/summary.ts',
        'src/types.ts',
      ],
      rerootDepthOneEdgeIds: [
        'src/index.ts->src/utils.ts#call',
        'src/index.ts->src/utils.ts#import',
        'src/utils.ts->src/summary.ts#call',
        'src/utils.ts->src/summary.ts#import',
        'src/utils.ts->src/types.ts#call',
        'src/utils.ts->src/types.ts#import',
      ],
    },
  },
  {
    name: 'godot',
    workspaceRelativePath: 'examples/example-godot',
    pluginDevelopmentRelativePaths: [],
    workspacePluginPackageRelativePaths: [
      'packages/plugin-godot',
      'packages/extension/src/e2e/fixtures/package-graph-view-plugin',
    ],
    graphNodeExtension: '.gd',
    expectedNodeIds: [
      'scripts/player.gd',
      'scripts/enemy.gd',
      'scripts/utils/math_helpers.gd',
    ],
    minimumExpectedEdgeIds: [
      'scripts/player.gd->scripts/utils/math_helpers.gd#load',
      'scripts/enemy.gd->scripts/player.gd#reference',
    ],
    primaryFileRelativePath: 'scripts/player.gd',
    tempFileRelativePath: 'scripts/__e2e_temp__.gd',
    tempFileContents: 'extends Node\n',
    saveTriggerText: '\n# e2e save trigger',
    depth: {
      rootFileRelativePath: 'scripts/player.gd',
      depthOneNodeIds: [
        'scripts/enemy.gd',
        'scripts/game_manager.gd',
        'scripts/player.gd',
        'scripts/utils/math_helpers.gd',
      ],
      depthOneEdgeIds: [
        'scripts/enemy.gd->scripts/player.gd#reference',
        'scripts/enemy.gd->scripts/utils/math_helpers.gd#load',
        'scripts/game_manager.gd->scripts/enemy.gd#reference',
        'scripts/game_manager.gd->scripts/player.gd#reference',
        'scripts/player.gd->scripts/utils/math_helpers.gd#load',
      ],
      depthTwoNodeIds: [
        'scripts/base/entity.gd',
        'scripts/enemy.gd',
        'scripts/game_manager.gd',
        'scripts/player.gd',
        'scripts/utils/math_helpers.gd',
      ],
      excludedAtDepthTwo: ['scripts/orphan.gd'],
      selectedNodeId: 'scripts/orphan.gd',
      selectedNodeDepthOneNodeIds: ['scripts/orphan.gd'],
      selectedNodeDepthOneEdgeIds: [],
      rerootNodeId: 'scripts/enemy.gd',
      rerootDepthOneNodeIds: [
        'scripts/base/entity.gd',
        'scripts/enemy.gd',
        'scripts/game_manager.gd',
        'scripts/player.gd',
        'scripts/utils/math_helpers.gd',
      ],
      rerootDepthOneEdgeIds: [
        'scripts/enemy.gd->scripts/base/entity.gd#inherit',
        'scripts/enemy.gd->scripts/player.gd#reference',
        'scripts/enemy.gd->scripts/utils/math_helpers.gd#load',
        'scripts/game_manager.gd->scripts/enemy.gd#reference',
        'scripts/game_manager.gd->scripts/player.gd#reference',
        'scripts/player.gd->scripts/utils/math_helpers.gd#load',
      ],
    },
  },
];

export function getE2EScenario(name: string | undefined): E2EScenario {
  const scenario = e2eScenarios.find((entry) => entry.name === name);
  if (!scenario) {
    throw new Error(`Unknown e2e scenario: ${name ?? '<unset>'}`);
  }
  return scenario;
}

export function getCurrentE2EScenario(): E2EScenario {
  return getE2EScenario(process.env.CODEGRAPHY_E2E_SCENARIO);
}
