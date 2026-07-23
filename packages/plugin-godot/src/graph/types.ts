import type {
  IPluginEdgeType,
  IPluginNodeType,
} from '@codegraphy-dev/plugin-api';

const GODOT_SYMBOL_SOURCE = 'codegraphy.gdscript';

export function createGodotNodeTypes(): IPluginNodeType[] {
  return [
    {
      id: 'plugin:codegraphy.gdscript:symbol:godot-class-name',
      label: 'Godot class_name',
      defaultVisible: false,
      parentId: 'variable',
      matchSymbolKinds: ['class'],
      matchSymbolPluginKind: 'godot-class-name',
      matchSymbolSource: GODOT_SYMBOL_SOURCE,
      matchSymbolLanguage: 'gdscript',
      matchSymbolFilePath: '**/*.gd',
      description: {
        description: 'Godot script class names registered for use elsewhere in a project.',
        examples: [{ label: 'GDScript', code: 'class_name PlayerController' }],
      },
    },
    {
      id: 'plugin:codegraphy.gdscript:symbol:scene',
      label: 'Scene',
      defaultVisible: false,
      parentId: 'symbol',
      matchSymbolKinds: ['scene'],
      matchSymbolPluginKind: 'scene',
      matchSymbolSource: GODOT_SYMBOL_SOURCE,
      description: {
        description: 'Godot scene roots declared in text scene files.',
        examples: [{ label: 'Godot', code: '[node name="Player" type="CharacterBody2D"]' }],
      },
    },
    {
      id: 'plugin:codegraphy.gdscript:symbol:resource',
      label: 'Resource',
      defaultVisible: false,
      parentId: 'symbol',
      matchSymbolKinds: ['resource'],
      matchSymbolPluginKind: 'resource',
      matchSymbolSource: GODOT_SYMBOL_SOURCE,
      description: {
        description: 'Godot text resources such as .tres configuration assets.',
        examples: [{ label: 'Godot', code: '[gd_resource type="Resource"]' }],
      },
    },
    {
      id: 'plugin:codegraphy.gdscript:symbol:autoload',
      label: 'Autoload',
      defaultVisible: false,
      parentId: 'symbol',
      matchSymbolKinds: ['autoload'],
      matchSymbolPluginKind: 'autoload',
      matchSymbolSource: GODOT_SYMBOL_SOURCE,
      description: {
        description: 'Godot project autoload singletons declared in project.godot.',
        examples: [{ label: 'Godot', code: 'GameManager="*res://scripts/game_manager.gd"' }],
      },
    },
    {
      id: 'plugin:codegraphy.gdscript:symbol:scene-node',
      label: 'Scene Node',
      defaultVisible: false,
      parentId: 'symbol',
      matchSymbolKinds: ['scene-node'],
      matchSymbolPluginKind: 'scene-node',
      matchSymbolSource: GODOT_SYMBOL_SOURCE,
      description: {
        description: 'Named nodes declared inside Godot text scene files.',
        examples: [{ label: 'Godot', code: '[node name="HealthComponent" parent="."]' }],
      },
    },
    {
      id: 'plugin:codegraphy.gdscript:symbol:signal',
      label: 'Signal',
      defaultVisible: false,
      parentId: 'symbol',
      matchSymbolKinds: ['signal'],
      matchSymbolPluginKind: 'signal',
      matchSymbolSource: GODOT_SYMBOL_SOURCE,
      description: {
        description: 'GDScript signal declarations that other scripts can connect to.',
        examples: [{
          label: 'GDScript',
          code: 'signal health_changed(current: int, maximum: int)',
        }],
      },
    },
    {
      id: 'plugin:codegraphy.gdscript:symbol:exported-property',
      label: 'Exported Property',
      defaultVisible: false,
      parentId: 'variable',
      matchSymbolKinds: ['variable'],
      matchSymbolPluginKind: 'exported-property',
      matchSymbolSource: GODOT_SYMBOL_SOURCE,
      matchSymbolLanguage: 'gdscript',
      matchSymbolFilePath: '**/*.gd',
      description: {
        description: 'GDScript variables exported to the Godot editor inspector.',
        examples: [{ label: 'GDScript', code: '@export var speed: float = 300.0' }],
      },
    },
  ];
}

export function createGodotEdgeTypes(): IPluginEdgeType[] {
  return [
    {
      id: 'codegraphy.gdscript:signal-connection',
      label: 'Signal Connections',
      defaultVisible: false,
      description: {
        description: 'Shows Godot signal declarations connected to receiving scripts.',
        examples: [{
          label: 'GDScript',
          code: 'health.health_changed.connect(set_health)',
        }],
      },
    },
  ];
}
