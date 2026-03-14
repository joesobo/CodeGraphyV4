import { describe, expect, it } from 'vitest';
import { ColorPaletteManager, DEFAULT_FALLBACK_COLOR } from '../../../src/core/colors/ColorPaletteManager';

describe('ColorPaletteManager file matching', () => {
  it('matches user path globs after normalizing Windows separators', () => {
    const manager = new ColorPaletteManager();

    manager.setUserColors({ 'src/*.test.ts': '#10B981' });

    expect(manager.getColorForFile('src\\utils.test.ts')).toBe('#10B981');
  });

  it('matches hidden files with user glob patterns', () => {
    const manager = new ColorPaletteManager();

    manager.setUserColors({ '**/*.env': '#FACC15' });

    expect(manager.getColorForFile('config/.env')).toBe('#FACC15');
  });

  it('skips non-matching user patterns before returning a later match', () => {
    const manager = new ColorPaletteManager();

    manager.setUserColors({
      Makefile: '#FF5733',
      '**/*.test.ts': '#10B981',
    });

    expect(manager.getColorForFile('src/utils.test.ts')).toBe('#10B981');
  });

  it('matches plugin path globs after normalizing Windows separators', () => {
    const manager = new ColorPaletteManager();

    manager.setPluginColors({ 'src/*.test.ts': '#3B82F6' });

    expect(manager.getColorForFile('src\\utils.test.ts')).toBe('#3B82F6');
  });

  it('matches exact plugin filenames before falling back to extension colors', () => {
    const manager = new ColorPaletteManager();

    manager.generateForExtensions(['.gitignore']);
    manager.setPluginColors({ '.gitignore': '#478CBF' });

    expect(manager.getColorForFile('config/.gitignore')).toBe('#478CBF');
  });

  it('skips non-matching plugin patterns before returning a later match', () => {
    const manager = new ColorPaletteManager();

    manager.setPluginColors({
      Makefile: '#FF5733',
      '**/*.test.ts': '#3B82F6',
    });

    expect(manager.getColorForFile('src/utils.test.ts')).toBe('#3B82F6');
  });

  it('does not treat dotfiles as extension fallbacks', () => {
    const manager = new ColorPaletteManager();

    manager.generateForExtensions(['.env']);

    expect(manager.getColorForFile('config/.env')).toBe(DEFAULT_FALLBACK_COLOR);
  });

  it('treats short plain names as filenames instead of extension colors', () => {
    const manager = new ColorPaletteManager();

    manager.setUserColors({ todo: '#A855F7' });

    expect(manager.getColorForFile('todo')).toBe('#A855F7');
    expect(manager.getColor('.todo')).toBe(DEFAULT_FALLBACK_COLOR);
  });

  it('matches exact filenames before falling back to extension colors', () => {
    const manager = new ColorPaletteManager();

    manager.generateForExtensions(['.ts']);
    manager.setUserColors({ '.gitignore': '#6B7280' });

    expect(manager.getColorForFile('src/.gitignore')).toBe('#6B7280');
  });

  it('returns user info for later user pattern matches', () => {
    const manager = new ColorPaletteManager();

    manager.setUserColors({
      Makefile: '#FF5733',
      '**/*.test.ts': '#10B981',
    });

    expect(manager.getColorInfoForFile('src/utils.test.ts')).toEqual({
      color: '#10B981',
      source: 'user',
    });
  });

  it('returns user info for exact filename matches', () => {
    const manager = new ColorPaletteManager();

    manager.setUserColors({ '.gitignore': '#6B7280' });

    expect(manager.getColorInfoForFile('config/.gitignore')).toEqual({
      color: '#6B7280',
      source: 'user',
    });
  });

  it('normalizes Windows separators before matching user info patterns', () => {
    const manager = new ColorPaletteManager();

    manager.setUserColors({ 'src/*.test.ts': '#10B981' });

    expect(manager.getColorInfoForFile('src\\utils.test.ts')).toEqual({
      color: '#10B981',
      source: 'user',
    });
  });

  it('returns plugin info for exact filename matches', () => {
    const manager = new ColorPaletteManager();

    manager.setPluginColors({ '.gitignore': '#478CBF' });

    expect(manager.getColorInfoForFile('config/.gitignore')).toEqual({
      color: '#478CBF',
      source: 'plugin',
    });
  });

  it('returns plugin info for hidden files matched by glob patterns', () => {
    const manager = new ColorPaletteManager();

    manager.setPluginColors({ '**/*.env': '#478CBF' });

    expect(manager.getColorInfoForFile('config/.env')).toEqual({
      color: '#478CBF',
      source: 'plugin',
    });
  });

  it('returns plugin info from a later matching pattern instead of the first entry', () => {
    const manager = new ColorPaletteManager();

    manager.setPluginColors({
      Makefile: '#FF5733',
      '.gitignore': '#478CBF',
    });

    expect(manager.getColorInfoForFile('config/.gitignore')).toEqual({
      color: '#478CBF',
      source: 'plugin',
    });
  });

  it('returns generated info when no filename or path pattern matches', () => {
    const manager = new ColorPaletteManager();

    manager.generateForExtensions(['.ts']);

    expect(manager.getColorInfoForFile('utils.ts')).toEqual({
      color: manager.getColor('.ts'),
      source: 'generated',
    });
  });
});
