import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MaterialIconData, MaterialThemeCacheEntry } from './model';
import { extractPrimaryColor, toSvgDataUrl, toWhiteSvgDataUrl } from './svg';

export function resolveIconData(
  theme: MaterialThemeCacheEntry,
  iconName: string,
  mode: 'file' | 'folder' = 'file',
): MaterialIconData | undefined {
  const cacheKey = `${mode}:${iconName}`;
  const cached = theme.iconDataByName.get(cacheKey);
  if (cached) {
    return cached;
  }

  const iconPath = theme.manifest.iconDefinitions?.[iconName]?.iconPath;
  if (!iconPath) {
    return undefined;
  }

  const resolvedIconPath = path.resolve(path.dirname(theme.manifestPath), iconPath);
  if (!fs.existsSync(resolvedIconPath)) {
    return undefined;
  }

  const svg = fs.readFileSync(resolvedIconPath, 'utf8');
  const iconData = {
    color: extractPrimaryColor(svg),
    imageUrl: mode === 'folder' ? toSvgDataUrl(svg) : toWhiteSvgDataUrl(svg),
  } satisfies MaterialIconData;

  theme.iconDataByName.set(cacheKey, iconData);
  return iconData;
}
