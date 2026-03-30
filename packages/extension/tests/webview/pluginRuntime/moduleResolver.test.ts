import { describe, expect, it } from 'vitest';
import { resolvePluginModuleActivator } from '../../../src/webview/pluginRuntime/moduleResolver';

describe('pluginRuntime/moduleResolver', () => {
  it('returns the top-level activate function when present', () => {
    const activate = () => undefined;

    expect(resolvePluginModuleActivator({ activate })).toBe(activate);
  });

  it('returns the default export when it is a function', () => {
    const defaultFn = () => undefined;

    expect(resolvePluginModuleActivator({ default: defaultFn })).toBe(defaultFn);
  });

  it('returns activate from a default object when present', () => {
    const activate = () => undefined;

    expect(resolvePluginModuleActivator({ default: { activate } })).toBe(activate);
  });

  it('returns undefined when the default object has no activate function', () => {
    expect(resolvePluginModuleActivator({ default: {} })).toBeUndefined();
  });

  it('returns undefined when default is null', () => {
    expect(resolvePluginModuleActivator({ default: null } as never)).toBeUndefined();
  });

  it('returns undefined when default is a primitive value', () => {
    expect(resolvePluginModuleActivator({ default: 'string' } as never)).toBeUndefined();
  });

  it('returns undefined when no activator is present', () => {
    expect(resolvePluginModuleActivator({})).toBeUndefined();
  });

  it('prefers activate over default when both are present', () => {
    const activate = () => undefined;
    const defaultFn = () => undefined;

    expect(resolvePluginModuleActivator({ activate, default: defaultFn })).toBe(activate);
  });

  it('returns undefined for truthy default values that are not objects or functions', () => {
    expect(() =>
      resolvePluginModuleActivator({ default: 'string' as unknown as (() => void) }),
    ).not.toThrow();
    expect(resolvePluginModuleActivator({ default: 'string' as unknown as (() => void) })).toBeUndefined();
    expect(resolvePluginModuleActivator({ default: 42 as unknown as (() => void) })).toBeUndefined();
  });

  it('returns undefined for null default values', () => {
    expect(resolvePluginModuleActivator({ default: null as unknown as (() => void) })).toBeUndefined();
  });
});
