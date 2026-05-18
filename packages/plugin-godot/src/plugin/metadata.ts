import { GDScriptPathResolver } from '../PathResolver';
import {
  extractGDScriptClassNameDeclarations,
} from '../parser';
import { parseGodotTextResourceDocument } from '../textResource/parser';
import { readGodotResourceUid } from '../textResource/resourceAst';

export function extractResourceUid(content: string): string | null {
  const parsedUid = readGodotResourceUid(content);
  if (parsedUid) {
    return parsedUid;
  }

  for (const tag of parseGodotTextResourceDocument(content).tags) {
    if ((tag.name === 'gd_scene' || tag.name === 'gd_resource') && tag.fields.uid) {
      return tag.fields.uid;
    }
  }

  return null;
}

export function extractClassNames(content: string): string[] {
  const classNames = new Set<string>();

  for (const ref of extractGDScriptClassNameDeclarations(content)) {
    classNames.add(ref.resPath);
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
