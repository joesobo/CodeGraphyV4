import { describe, expect, it } from 'vitest';
import { ColorPaletteManager, DEFAULT_FALLBACK_COLOR } from '../../../src/core/colors/ColorPaletteManager';

describe('ColorPaletteManager priority', () => {
  it('lets plugin extension colors override generated colors', () => {
    const manager = new ColorPaletteManager();

    manager.generateForExtensions(['.ts', '.js']);
    manager.setPluginColors({ '.ts': '#FF0000' });

    expect(manager.getColor('.ts')).toBe('#FF0000');
  });

  it('adds plugin patterns without clearing existing plugin extensions', () => {
    const manager = new ColorPaletteManager();

    manager.setPluginColors({ '.ts': '#FF0000' });
    manager.addPluginColors({ '**/*.test.ts': '#10B981' });

    expect(manager.getColor('.ts')).toBe('#FF0000');
    expect(manager.getColorForFile('src/utils.test.ts')).toBe('#10B981');
  });

  it('adds plugin extension colors without clearing existing plugin patterns', () => {
    const manager = new ColorPaletteManager();

    manager.setPluginColors({ '**/*.test.ts': '#10B981' });
    manager.addPluginColors({ '.js': '#00FF00' });

    expect(manager.getColorForFile('src/utils.test.ts')).toBe('#10B981');
    expect(manager.getColor('.js')).toBe('#00FF00');
  });

  it('lets user extension colors override plugin extension colors', () => {
    const manager = new ColorPaletteManager();

    manager.setPluginColors({ '.ts': '#FF0000' });
    manager.setUserColors({ '.ts': '#00FF00' });

    expect(manager.getColor('.ts')).toBe('#00FF00');
  });

  it('normalizes whitespace and casing during extension lookup', () => {
    const manager = new ColorPaletteManager();

    manager.setPluginColors({ '.ts': '#FF0000' });

    expect(manager.getColor('  TS  ')).toBe('#FF0000');
  });

  it('treats four-character dotted keys as extension colors', () => {
    const manager = new ColorPaletteManager();

    manager.setPluginColors({ '.yaml': '#FF0000' });

    expect(manager.getColor('.yaml')).toBe('#FF0000');
  });

  it('returns the correct source for generated, plugin, and user extension colors', () => {
    const generatedManager = new ColorPaletteManager();
    generatedManager.generateForExtensions(['.ts']);

    const pluginManager = new ColorPaletteManager();
    pluginManager.setPluginColors({ '.ts': '#FF0000' });

    const userManager = new ColorPaletteManager();
    userManager.setUserColors({ '.ts': '#00FF00' });

    expect(generatedManager.getColorInfo('.ts')).toEqual({
      color: generatedManager.getColor('.ts'),
      source: 'generated',
    });
    expect(pluginManager.getColorInfo('.ts')).toEqual({
      color: '#FF0000',
      source: 'plugin',
    });
    expect(userManager.getColorInfo('.ts')).toEqual({
      color: '#00FF00',
      source: 'user',
    });
  });

  it('returns the fallback info for unknown extensions', () => {
    const manager = new ColorPaletteManager();

    expect(manager.getColorInfo('.unknown')).toEqual({
      color: DEFAULT_FALLBACK_COLOR,
      source: 'generated',
    });
  });

  it('merges generated, plugin, and user entries in priority order', () => {
    const manager = new ColorPaletteManager();

    manager.generateForExtensions(['.ts', '.js']);
    manager.setPluginColors({
      '.ts': '#PLUGIN_TS',
      '.css': '#PLUGIN_CSS',
      '**/.env': '#PLUGIN_ENV',
    });
    manager.setUserColors({
      '.ts': '#USER_TS',
      'Makefile': '#USER_MAKE',
    });

    const map = manager.getColorMap();

    expect(map['.js']).toBe(manager.getColor('.js'));
    expect(map['.ts']).toBe('#USER_TS');
    expect(map['.css']).toBe('#PLUGIN_CSS');
    expect(map['**/.env']).toBe('#PLUGIN_ENV');
    expect(map.Makefile).toBe('#USER_MAKE');
  });

  it('clears extension and pattern colors from every source', () => {
    const manager = new ColorPaletteManager();

    manager.generateForExtensions(['.ts']);
    manager.setPluginColors({ '.js': '#FF0000' });
    manager.setUserColors({ Makefile: '#00FF00' });

    manager.clear();

    expect(manager.getColor('.ts')).toBe(DEFAULT_FALLBACK_COLOR);
    expect(manager.getColor('.js')).toBe(DEFAULT_FALLBACK_COLOR);
    expect(manager.getColorForFile('Makefile')).toBe(DEFAULT_FALLBACK_COLOR);
  });
});
