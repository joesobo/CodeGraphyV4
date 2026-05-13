import {
  mdiCodeBraces,
  mdiFolder,
  mdiImage,
  mdiPackageVariant,
  mdiPuzzleOutline,
  mdiShapeOutline,
  mdiViewGridOutline,
} from '@mdi/js';
import type { LegendIconImport } from '../../../../shared/protocol/webviewToExtension';

export interface GraphSectionMaterialIconOption {
  id: string;
  label: string;
  path: string;
}

export const GRAPH_SECTION_MATERIAL_ICONS: GraphSectionMaterialIconOption[] = [
  { id: 'mdi:folder', label: 'Folder', path: mdiFolder },
  { id: 'mdi:code-braces', label: 'Code', path: mdiCodeBraces },
  { id: 'mdi:package-variant', label: 'Package', path: mdiPackageVariant },
  { id: 'mdi:puzzle-outline', label: 'Plugin', path: mdiPuzzleOutline },
  { id: 'mdi:shape-outline', label: 'Shapes', path: mdiShapeOutline },
  { id: 'mdi:view-grid-outline', label: 'Grid', path: mdiViewGridOutline },
  { id: 'mdi:image', label: 'Image', path: mdiImage },
];

export function getGraphSectionMaterialIconPath(icon: string | undefined): string | undefined {
  return GRAPH_SECTION_MATERIAL_ICONS.find(option => option.id === icon)?.path;
}

export function isGraphSectionUploadedIcon(icon: string | undefined): icon is string {
  return !!icon && (
    /^data:image\/(?:png|svg\+xml);base64,/.test(icon)
    || /^\.codegraphy\/icons\/[^/]+?\.(?:svg|png)$/i.test(icon)
  );
}

function fileToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
        return;
      }

      reject(new Error('Unable to read graph section icon file.'));
    });
    reader.addEventListener('error', () => reject(reader.error ?? new Error('Unable to read graph section icon file.')));
    reader.readAsArrayBuffer(file);
  });
}

function getIconMimeType(file: File): string {
  if (file.type === 'image/png' || file.type === 'image/svg+xml') {
    return file.type;
  }

  return file.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/svg+xml';
}

function sanitizeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'icon';
}

function getIconExtension(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension === 'png' ? 'png' : 'svg';
}

export async function readGraphSectionIconUpload(
  sectionId: string,
  file: File,
): Promise<{ imageUrl: string; importPayload: LegendIconImport }> {
  const extension = getIconExtension(file);
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const imagePath = `.codegraphy/icons/${sanitizeSegment(sectionId)}-${sanitizeSegment(baseName)}.${extension}`;
  const contentsBase64 = fileToBase64(await readFileAsArrayBuffer(file));

  return {
    imageUrl: `data:${getIconMimeType(file)};base64,${contentsBase64}`,
    importPayload: {
      imagePath,
      contentsBase64,
    },
  };
}
