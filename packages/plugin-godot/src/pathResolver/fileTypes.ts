export function isGDScriptFile(filePath: string): boolean {
  return filePath.endsWith('.gd');
}

export function isGodotTextResourceFile(filePath: string): boolean {
  return filePath.endsWith('.tscn') || filePath.endsWith('.tres');
}
