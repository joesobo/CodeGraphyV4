import * as path from 'path';
import { toSnakeCase } from '../resource-utils';

export class GDScriptScriptRegistry {
  private classNameMap: Map<string, string> = new Map();
  private fileNameMap: Map<string, string> = new Map();
  private fileClassNames: Map<string, Set<string>> = new Map();
  private registeredFiles: Set<string> = new Set();

  registerClassName(className: string, filePath: string): void {
    this.classNameMap.set(className, filePath);
    const classNames = this.fileClassNames.get(filePath) ?? new Set<string>();
    classNames.add(className);
    this.fileClassNames.set(filePath, classNames);
  }

  registerFile(filePath: string): void {
    const base = path.basename(filePath, '.gd');
    this.fileNameMap.set(base, filePath);
    this.registeredFiles.add(filePath);
  }

  replaceFileClassNames(filePath: string, classNames: readonly string[]): { changed: boolean } {
    const previous = this.fileClassNames.get(filePath) ?? new Set<string>();
    const next = new Set(classNames);
    const changed = previous.size !== next.size
      || [...previous].some((className) => !next.has(className));

    for (const className of previous) {
      if (this.classNameMap.get(className) === filePath) {
        this.classNameMap.delete(className);
      }
    }

    this.fileClassNames.delete(filePath);
    if (next.size > 0) {
      this.fileClassNames.set(filePath, next);
      for (const className of next) {
        this.classNameMap.set(className, filePath);
      }
    }
    return { changed };
  }

  resolveClassName(className: string): string | null {
    return this.classNameMap.get(className) ?? null;
  }

  resolveSnakeCaseFile(className: string): string | null {
    return this.fileNameMap.get(toSnakeCase(className)) ?? null;
  }

  clear(): void {
    this.classNameMap.clear();
    this.fileNameMap.clear();
    this.fileClassNames.clear();
    this.registeredFiles.clear();
  }

  getClassNameMap(): Map<string, string> {
    return new Map(this.classNameMap);
  }

  getFileNameMap(): Map<string, string> {
    return new Map(this.fileNameMap);
  }

  getRegisteredFiles(): string[] {
    return [...this.registeredFiles];
  }
}
