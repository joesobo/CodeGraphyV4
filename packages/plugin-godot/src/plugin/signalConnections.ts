import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { GDScriptPathResolver } from '../PathResolver';
import { buildSignalConnectionRelations } from './signalConnectionBuild';
import { readChangedRelationSourceFiles } from './signalConnectionChanges';
import type { GodotWorkspaceFile } from './types';

export class GodotSignalConnectionIndex {
  private fileContents = new Map<string, string>();
  private relationsBySourceFile = new Map<string, IAnalysisRelation[]>();

  replaceWorkspaceFiles(files: readonly GodotWorkspaceFile[], workspaceRoot: string, resolver: GDScriptPathResolver): void {
    this.fileContents = new Map(files
      .filter(file => file.relativePath.endsWith('.gd'))
      .map(file => [file.relativePath, file.content]));
    this.relationsBySourceFile = buildSignalConnectionRelations(this.fileContents, workspaceRoot, resolver);
  }

  replaceFiles(files: readonly GodotWorkspaceFile[], workspaceRoot: string, resolver: GDScriptPathResolver): string[] {
    const previous = this.relationsBySourceFile;
    for (const file of files) {
      if (file.relativePath.endsWith('.gd')) this.fileContents.set(file.relativePath, file.content);
    }
    this.relationsBySourceFile = buildSignalConnectionRelations(this.fileContents, workspaceRoot, resolver);
    return readChangedRelationSourceFiles(previous, this.relationsBySourceFile);
  }

  getRelations(relativeFilePath: string): IAnalysisRelation[] {
    return this.relationsBySourceFile.get(relativeFilePath) ?? [];
  }

  clear(): void {
    this.fileContents.clear();
    this.relationsBySourceFile.clear();
  }
}
