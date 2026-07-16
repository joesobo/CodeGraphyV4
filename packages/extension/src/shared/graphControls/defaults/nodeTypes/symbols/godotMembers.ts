import type { IGraphNodeTypeDefinition } from '../../../contracts';
import { createGodotSymbolNodeType } from './definition';

export function createGodotMemberNodeTypes(): IGraphNodeTypeDefinition[] {
  return [
    createGodotSymbolNodeType({
      id: 'plugin:codegraphy.gdscript:symbol:scene-node',
      label: 'Scene Node',
      defaultColor: '#A855F7',
      pluginKind: 'scene-node',
      description: {
        description: 'Named nodes declared inside Godot text scene files.',
        examples: [{ label: 'Godot', code: '[node name="HealthComponent" parent="."]' }],
      },
    }),
    createGodotSymbolNodeType({
      id: 'plugin:codegraphy.gdscript:symbol:signal',
      label: 'Signal',
      defaultColor: '#EF4444',
      pluginKind: 'signal',
      description: {
        description: 'GDScript signal declarations that other scripts can connect to.',
        examples: [{ label: 'GDScript', code: 'signal health_changed(current: int, maximum: int)' }],
      },
    }),
  ];
}
