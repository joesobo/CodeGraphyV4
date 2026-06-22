import manifest from '../../../codegraphy.json';

export const GODOT_SYMBOL_SOURCE = manifest.id;
export const GODOT_SCRIPT_LANGUAGE = 'gdscript';
export const GODOT_TEXT_RESOURCE_LANGUAGE = 'godot-resource';
export const GODOT_PROJECT_SETTINGS_LANGUAGE = 'godot-project-settings';

export const GODOT_SYMBOL_PLUGIN_KIND = {
  autoload: 'autoload',
  className: 'godot-class-name',
  exportedProperty: 'exported-property',
  resource: 'resource',
  scene: 'scene',
  sceneNode: 'scene-node',
  signal: 'signal',
} as const;
