import { describe, expect, it } from 'vitest';
import {
  getPluginsPanelChevronClassName,
  getPluginsPanelRuleCountClassName,
  getPluginsPanelRuleLabelClassName,
  getPluginsPanelWrapperClassName,
  shouldRenderPluginsPanelRuleDescription,
  shouldRenderPluginsPanelSeparator,
  toggleExpandedPluginIds,
} from '../../../src/webview/components/plugins/model';

describe('plugins panel model', () => {
  it('adds the rotation class to expanded chevrons', () => {
    expect(getPluginsPanelChevronClassName(true)).toContain('rotate-90');
  });

  it('omits the rotation class from collapsed chevrons', () => {
    expect(getPluginsPanelChevronClassName(false)).not.toContain('rotate-90');
  });

  it('dims disabled plugin rows', () => {
    expect(getPluginsPanelWrapperClassName(false)).toBe('opacity-50');
  });

  it('leaves enabled plugin rows undimmed', () => {
    expect(getPluginsPanelWrapperClassName(true)).toBe('');
  });

  it('uses enabled rule label styling when the plugin is enabled', () => {
    expect(getPluginsPanelRuleLabelClassName(true)).toBe('text-foreground');
  });

  it('uses muted rule label styling when the plugin is disabled', () => {
    expect(getPluginsPanelRuleLabelClassName(false)).toBe('text-muted-foreground/50');
  });

  it('uses enabled rule count styling when the plugin is enabled', () => {
    expect(getPluginsPanelRuleCountClassName(true)).toBe('text-muted-foreground');
  });

  it('uses muted rule count styling when the plugin is disabled', () => {
    expect(getPluginsPanelRuleCountClassName(false)).toBe('text-muted-foreground/50');
  });

  it('renders rule descriptions only when text is present', () => {
    expect(shouldRenderPluginsPanelRuleDescription('Tracks imports')).toBe(true);
    expect(shouldRenderPluginsPanelRuleDescription('')).toBe(false);
  });

  it('renders separators only between plugin rows', () => {
    expect(shouldRenderPluginsPanelSeparator(0, 2)).toBe(true);
    expect(shouldRenderPluginsPanelSeparator(1, 2)).toBe(false);
  });

  it('adds a collapsed plugin to the expanded set', () => {
    expect([...toggleExpandedPluginIds(new Set(['a']), 'b')]).toEqual(['a', 'b']);
  });

  it('removes an expanded plugin from the expanded set', () => {
    expect([...toggleExpandedPluginIds(new Set(['a', 'b']), 'b')]).toEqual(['a']);
  });
});
