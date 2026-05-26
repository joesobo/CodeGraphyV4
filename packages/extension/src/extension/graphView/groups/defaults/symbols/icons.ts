import { toSvgDataUrl } from '../materialTheme/svg';

export function createMaterialSymbolIconDataUrl(pathData: string): string {
  return toSvgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#FFFFFF" d="${pathData}"/></svg>`);
}
