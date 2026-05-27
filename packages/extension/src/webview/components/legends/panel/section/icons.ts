import type { LegendIconImport } from '../../../../../shared/protocol/webviewToExtension';
import { arrayBufferToBase64 } from './iconImport/encoding';
import { getIconMimeType } from './iconImport/mime';
import { buildLegendIconPath } from './iconImport/path';
import { readFileAsArrayBuffer } from './iconImport/read';

export async function createLegendIconImport(
  legendId: string,
  file: File,
): Promise<{ imageUrl: string; importPayload: LegendIconImport }> {
  const imagePath = buildLegendIconPath(legendId, file.name);
  const contentsBase64 = arrayBufferToBase64(await readFileAsArrayBuffer(file));

  return {
    imageUrl: `data:${getIconMimeType(file)};base64,${contentsBase64}`,
    importPayload: {
      imagePath,
      contentsBase64,
    },
  };
}
