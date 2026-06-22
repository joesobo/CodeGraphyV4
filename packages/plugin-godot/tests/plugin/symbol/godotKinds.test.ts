import { describe, expect, it } from 'vitest';
import {
  GODOT_PROJECT_SETTINGS_LANGUAGE,
  GODOT_SCRIPT_LANGUAGE,
  GODOT_SYMBOL_PLUGIN_KIND,
  GODOT_SYMBOL_SOURCE,
  GODOT_TEXT_RESOURCE_LANGUAGE,
} from '../../../src/plugin/symbol/godotKinds';

describe('Godot symbol vocabulary', () => {
  it('uses stable graph scope metadata identifiers', () => {
    expect({
      languages: [
        GODOT_PROJECT_SETTINGS_LANGUAGE,
        GODOT_SCRIPT_LANGUAGE,
        GODOT_TEXT_RESOURCE_LANGUAGE,
      ],
      pluginKinds: GODOT_SYMBOL_PLUGIN_KIND,
      source: GODOT_SYMBOL_SOURCE,
    }).toEqual({
      languages: [
        'godot-project-settings',
        'gdscript',
        'godot-resource',
      ],
      pluginKinds: {
        autoload: 'autoload',
        className: 'godot-class-name',
        exportedProperty: 'exported-property',
        resource: 'resource',
        scene: 'scene',
        sceneNode: 'scene-node',
        signal: 'signal',
      },
      source: 'codegraphy.gdscript',
    });
  });
});
