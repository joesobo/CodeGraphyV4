export type E2EScenarioName = 'typescript' | 'godot';

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
    name: 'typescript',
    workspaceRelativePath: 'examples/typescript-monorepo',
    pluginDevelopmentRelativePaths: ['packages/plugin-typescript'],
    graphNodeExtension: '.ts',
    expectedNodeIds: [
      'packages/app/src/index.ts',
      'packages/app/src/utils.ts',
      'packages/shared/src/types.ts',
    ],
    minimumExpectedEdgeIds: [
      'packages/app/src/index.ts->packages/app/src/utils.ts#import',
      'packages/app/src/index.ts->packages/shared/src/types.ts#import',
    ],
    primaryFileRelativePath: 'packages/app/src/index.ts',
    tempFileRelativePath: 'packages/app/src/__e2e_temp__.ts',
    tempFileContents: 'export const e2eTemp = true;\n',
    saveTriggerText: '\n// e2e save trigger',
    depth: {
      rootFileRelativePath: 'packages/app/src/index.ts',
      depthOneNodeIds: [
        'packages/app/src/index.ts',
        'packages/app/src/utils.ts',
        'packages/shared/src/types.ts',
      ],
      depthOneEdgeIds: [
        'packages/app/src/index.ts->packages/app/src/utils.ts#call',
        'packages/app/src/index.ts->packages/app/src/utils.ts#import',
        'packages/app/src/index.ts->packages/shared/src/types.ts#call',
        'packages/app/src/index.ts->packages/shared/src/types.ts#import',
        'packages/app/src/utils.ts->packages/shared/src/types.ts#call',
        'packages/app/src/utils.ts->packages/shared/src/types.ts#import',
      ],
      depthTwoNodeIds: [
        'packages/app/src/index.ts',
        'packages/app/src/utils.ts',
        'packages/feature-depth/src/deep.ts',
        'packages/shared/src/types.ts',
      ],
      excludedAtDepthTwo: ['packages/feature-depth/src/leaf.ts'],
      selectedNodeId: 'packages/app/src/orphan.ts',
      selectedNodeDepthOneNodeIds: ['packages/app/src/orphan.ts'],
      selectedNodeDepthOneEdgeIds: [],
      rerootNodeId: 'packages/app/src/utils.ts',
      rerootDepthOneNodeIds: [
        'packages/app/src/index.ts',
        'packages/app/src/utils.ts',
        'packages/feature-depth/src/deep.ts',
        'packages/shared/src/types.ts',
      ],
      rerootDepthOneEdgeIds: [
        'packages/app/src/index.ts->packages/app/src/utils.ts#call',
        'packages/app/src/index.ts->packages/app/src/utils.ts#import',
        'packages/app/src/index.ts->packages/shared/src/types.ts#call',
        'packages/app/src/index.ts->packages/shared/src/types.ts#import',
        'packages/app/src/utils.ts->packages/feature-depth/src/deep.ts#call',
        'packages/app/src/utils.ts->packages/feature-depth/src/deep.ts#import',
        'packages/app/src/utils.ts->packages/shared/src/types.ts#call',
        'packages/app/src/utils.ts->packages/shared/src/types.ts#import',
      ],
    },
  },
  {
    name: 'godot',
    workspaceRelativePath: 'examples/godot-game',
    pluginDevelopmentRelativePaths: ['packages/plugin-godot'],
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
      excludedAtDepthTwo: ['project.godot'],
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
