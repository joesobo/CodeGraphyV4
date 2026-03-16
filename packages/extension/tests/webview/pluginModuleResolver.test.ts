import { describe, it, expect } from 'vitest';
import { resolvePluginModuleActivator } from '../../src/webview/pluginModuleResolver';

describe('resolvePluginModuleActivator', () => {
  it('returns the top-level activate function when present', () => {
    const activate = () => undefined;
    expect(resolvePluginModuleActivator({ activate })).toBe(activate);
  });

  it('returns the default export when it is a function', () => {
    const defaultFn = () => undefined;
    expect(resolvePluginModuleActivator({ default: defaultFn })).toBe(defaultFn);
  });

  it('returns activate from default object when default is an object with activate', () => {
    const activate = () => undefined;
    expect(resolvePluginModuleActivator({ default: { activate } })).toBe(activate);
  });

  it('returns undefined when default is an empty object without activate', () => {
    expect(resolvePluginModuleActivator({ default: {} })).toBeUndefined();
  });

  it('returns undefined when neither activate nor default is present', () => {
    expect(resolvePluginModuleActivator({})).toBeUndefined();
  });

  it('prefers activate over default when both are present', () => {
    const activate = () => undefined;
    const defaultFn = () => undefined;
    expect(resolvePluginModuleActivator({ activate, default: defaultFn })).toBe(activate);
  });

  it('returns undefined when default is a non-function, non-object value', () => {
    expect(resolvePluginModuleActivator({ default: 'string' as unknown as (() => void) })).toBeUndefined();
  });

  it('returns undefined when default is null', () => {
    expect(resolvePluginModuleActivator({ default: null as unknown as (() => void) })).toBeUndefined();
  });

  it('returns undefined when default is a number', () => {
    expect(resolvePluginModuleActivator({ default: 42 as unknown as (() => void) })).toBeUndefined();
  });

  it('returns undefined when default object has activate as a non-function', () => {
    expect(resolvePluginModuleActivator({ default: { activate: 'not-a-fn' } as unknown as { activate: () => void } })).toBe('not-a-fn');
  });
});
