import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MaterialIconData, MaterialThemeCacheEntry } from './model';
import { extractPrimaryColor, toWhiteSvgDataUrl } from './svg';

export function resolveIconData(
  theme: MaterialThemeCacheEntry,
  iconName: string,
): MaterialIconData | undefined {
  const cached = theme.iconDataByName.get(iconName);
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
    imageUrl: toWhiteSvgDataUrl(svg),
  } satisfies MaterialIconData;

  theme.iconDataByName.set(iconName, iconData);
  return iconData;
}
