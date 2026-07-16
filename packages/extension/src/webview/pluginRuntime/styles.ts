import { markCssColorsChanged } from '../cssColors/resolver';
import type { PluginManagerRefs } from './types';

function addPluginStyleOwner(
  refs: Pick<PluginManagerRefs, 'pluginStyles'>,
  pluginId: string,
  style: string,
): void {
  const styles = refs.pluginStyles.current.get(pluginId) ?? new Set();
  styles.add(style);
  refs.pluginStyles.current.set(pluginId, styles);
}

export function injectPluginStyle(
  refs: Pick<PluginManagerRefs, 'loadedStyles' | 'pluginStyles'>,
  pluginId: string,
  style: string,
): void {
  const existing = refs.loadedStyles.current.get(style);
  if (existing) {
    existing.pluginIds.add(pluginId);
    addPluginStyleOwner(refs, pluginId, style);
    return;
  }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = style;
  link.addEventListener('load', markCssColorsChanged, { once: true });
  document.head.appendChild(link);
  markCssColorsChanged();
  refs.loadedStyles.current.set(style, { link, pluginIds: new Set([pluginId]) });
  addPluginStyleOwner(refs, pluginId, style);
}

export function resetPluginStyles(
  refs: Pick<PluginManagerRefs, 'loadedStyles' | 'pluginStyles'>,
  pluginId: string,
): void {
  const styles = refs.pluginStyles.current.get(pluginId);
  if (!styles) return;
  for (const style of styles) {
    const loadedStyle = refs.loadedStyles.current.get(style);
    if (!loadedStyle) continue;
    loadedStyle.pluginIds.delete(pluginId);
    if (loadedStyle.pluginIds.size === 0) {
      loadedStyle.link.remove();
      refs.loadedStyles.current.delete(style);
      markCssColorsChanged();
    }
  }
  refs.pluginStyles.current.delete(pluginId);
}
