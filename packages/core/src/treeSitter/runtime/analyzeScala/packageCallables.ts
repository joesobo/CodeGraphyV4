import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ImportedBinding } from '../analyze/model';

export function addScalaPackageLocalCallables(
  callableBindings: Map<string, ImportedBinding>,
  filePath: string,
  packageName: string | null,
  sourceRoot: string | null,
): void {
  if (!packageName || !sourceRoot) return;
  for (const candidatePath of listScalaPackageFiles(path.join(sourceRoot, ...packageName.split('.')), filePath)) {
    addScalaFileBindings(callableBindings, candidatePath);
  }
}

function listScalaPackageFiles(packagePath: string, currentFilePath: string): string[] {
  try {
    return fs.readdirSync(packagePath)
      .filter(entry => entry.endsWith('.scala'))
      .map(entry => path.join(packagePath, entry))
      .filter(candidatePath => candidatePath !== currentFilePath);
  } catch {
    return [];
  }
}

function addScalaFileBindings(bindings: Map<string, ImportedBinding>, candidatePath: string): void {
  for (const name of readScalaDeclaredNames(candidatePath)) {
    bindings.set(name, { importedName: name, specifier: name, resolvedPath: candidatePath });
  }
}

function readScalaDeclaredNames(filePath: string): string[] {
  try {
    const source = fs.readFileSync(filePath, 'utf8');
    return [...source.matchAll(/\b(?:class|trait|object|enum|case\s+class)\s+([A-Z][A-Za-z_]\w*)/g)]
      .map(match => match[1]);
  } catch {
    return [];
  }
}
