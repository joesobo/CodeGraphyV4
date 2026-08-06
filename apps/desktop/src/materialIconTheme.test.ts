import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearMaterialIconThemeCache,
  resolveMaterialIcon,
} from './materialIconTheme';

const manifest = {
  fileExtensions: { ts: 'typescript' },
  folder: 'folder',
  folderNames: { src: 'folder-src' },
  iconDefinitions: {
    typescript: { iconPath: './../icons/typescript.svg' },
    folder: { iconPath: './../icons/folder.svg' },
    'folder-src': { iconPath: './../icons/folder-src.svg' },
  },
};

describe('Material Icon Theme adapter', () => {
  beforeEach(() => {
    clearMaterialIconThemeCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves and caches a white File icon with its original primary color', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = getRequestUrl(input);
      return url.endsWith('material-icons.json')
        ? Response.json(manifest)
        : new Response('<svg><path fill="#123456"/><path fill="#123456"/></svg>');
    });
    vi.stubGlobal('fetch', fetchMock);

    const first = await resolveMaterialIcon('src/index.ts', 'file');
    const second = await resolveMaterialIcon('src/index.ts', 'file');
    const sameIconForAnotherPath = await resolveMaterialIcon('src/model.ts', 'file');

    expect(first?.color).toBe('#123456');
    expect(first?.imageUrl).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(first?.mode).toBe('file');
    expect(decodeSvg(first?.imageUrl)).toContain('#FFFFFF');
    expect(decodeSvg(first?.imageUrl)).not.toContain('#123456');
    expect(second).toBe(first);
    expect(sameIconForAnotherPath).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps Folder SVG colors and requests transparent node semantics', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) =>
      getRequestUrl(input).endsWith('material-icons.json')
        ? Response.json(manifest)
        : new Response('<svg><path fill="#ABCDEF"/></svg>')));

    const icon = await resolveMaterialIcon('src', 'folder');

    expect(icon?.color).toBe('rgba(0, 0, 0, 0)');
    expect(icon?.mode).toBe('folder');
    expect(decodeSvg(icon?.imageUrl)).toContain('#ABCDEF');
  });

  it('uses the generic Folder icon when no named Folder rule matches', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) =>
      getRequestUrl(input).endsWith('material-icons.json')
        ? Response.json(manifest)
        : new Response('<svg><path fill="#FEDCBA"/></svg>'));
    vi.stubGlobal('fetch', fetchMock);

    const icon = await resolveMaterialIcon('docs', 'folder');

    expect(icon?.color).toBe('rgba(0, 0, 0, 0)');
    expect(decodeSvg(icon?.imageUrl)).toContain('#FEDCBA');
    expect(getRequestUrl(fetchMock.mock.calls[1]?.[0] ?? '')).toMatch(/\/icons\/folder\.svg$/);
  });

  it('returns undefined for a missing match and caches that work', async () => {
    const fetchMock = vi.fn(async () => Response.json(manifest));
    vi.stubGlobal('fetch', fetchMock);

    await expect(resolveMaterialIcon('README.unknown', 'file')).resolves.toBeUndefined();
    await expect(resolveMaterialIcon('README.unknown', 'file')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('rejects malformed manifest fields at the fetch boundary', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ fileExtensions: ['ts'] })));

    await expect(resolveMaterialIcon('src/index.ts', 'file')).rejects.toThrow(
      'Material Icon Theme manifest field "fileExtensions" must be an object.',
    );
  });

  it('rejects icon paths that escape the staged asset root', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({
      fileExtensions: { ts: 'typescript' },
      iconDefinitions: { typescript: { iconPath: '../../../outside.svg' } },
    })));

    await expect(resolveMaterialIcon('src/index.ts', 'file')).rejects.toThrow(
      'Material Icon Theme manifest contains an icon path outside staged assets.',
    );
  });
});

function decodeSvg(imageUrl: string | undefined): string {
  if (!imageUrl) throw new Error('Expected an SVG data URL.');
  const encoded = imageUrl.split(',')[1];
  if (!encoded) throw new Error('Expected base64 SVG data.');
  const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}
