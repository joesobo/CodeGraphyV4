import type { IGraphNodeTypeDefinition } from '../../../contracts';
import { createGodotSymbolNodeType } from './definition';

export function createGodotAssetNodeTypes(): IGraphNodeTypeDefinition[] {
  return [
    createGodotSymbolNodeType({
      id: 'plugin:codegraphy.gdscript:symbol:scene',
      label: 'Scene',
      defaultColor: '#478CBF',
      pluginKind: 'scene',
      description: {
        description: 'Godot scene roots declared in text scene files.',
        examples: [{ label: 'Godot', code: '[node name="Player" type="CharacterBody2D"]' }],
      },
    }),
    createGodotSymbolNodeType({
      id: 'plugin:codegraphy.gdscript:symbol:resource',
      label: 'Resource',
      defaultColor: '#F59E0B',
      pluginKind: 'resource',
      description: {
        description: 'Godot text resources such as .tres configuration assets.',
        examples: [{ label: 'Godot', code: '[gd_resource type="Resource"]' }],
      },
    }),
    createGodotSymbolNodeType({
      id: 'plugin:codegraphy.gdscript:symbol:autoload',
      label: 'Autoload',
      defaultColor: '#10B981',
      pluginKind: 'autoload',
      description: {
        description: 'Godot project autoload singletons declared in project.godot.',
        examples: [{ label: 'Godot', code: 'GameManager="*res://scripts/game_manager.gd"' }],
      },
    }),
  ];
}
