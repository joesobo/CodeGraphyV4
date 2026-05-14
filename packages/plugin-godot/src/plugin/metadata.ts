import { GDScriptPathResolver } from '../PathResolver';
import {
  detectClassNameDeclaration,
  parseGDScriptDocument,
} from '../parser';
import { parseGodotTextResourceDocument } from '../textResource/parser';

export function extractResourceUid(content: string): string | null {
  for (const tag of parseGodotTextResourceDocument(content).tags) {
    if ((tag.name === 'gd_scene' || tag.name === 'gd_resource') && tag.fields.uid) {
      return tag.fields.uid;
    }
  }

  return null;
}

export function extractClassNames(content: string): string[] {
  const classNames = new Set<string>();

  for (const statement of parseGDScriptDocument(content).statements) {
    const ref = detectClassNameDeclaration(statement.code, statement.line);
    if (ref) {
      classNames.add(ref.resPath);
    }
  }

  return [...classNames];
}

export function registerGodotFileMetadata(
  resolver: GDScriptPathResolver,
  relativePath: string,
  content: string,
): { classNamesChanged: boolean; resourceUidChanged: boolean } {
  resolver.registerFile(relativePath);
  const { changed: classNamesChanged } = resolver.replaceFileClassNames(
    relativePath,
    extractClassNames(content),
  );
  const { changed: resourceUidChanged } = resolver.replaceFileResourceUid(
    relativePath,
    extractResourceUid(content),
  );

  return { classNamesChanged, resourceUidChanged };
}

export function readChangedAnalysisTargets(
  resolver: GDScriptPathResolver,
  requiresBroadReanalysis: boolean,
  requiresTextResourceReanalysis: boolean,
): string[] {
  return [
    ...(requiresBroadReanalysis
      ? resolver.getRegisteredFiles().filter((filePath) => filePath.endsWith('.gd'))
      : []),
    ...(requiresTextResourceReanalysis ? resolver.getRegisteredTextResourceFiles() : []),
  ];
}
