import {
  parse,
  type ParsedGodotFile,
} from '@fernforestgames/godot-resource-parser';

export interface GodotParsedExternalResource {
  path: string;
  uid?: string;
}

export interface GodotParsedResourceAst {
  uid: string | null;
  extResources: GodotParsedExternalResource[];
}

function createResourceAst(file: ParsedGodotFile): GodotParsedResourceAst {
  return {
    uid: file.header.uid ?? null,
    extResources: file.extResources.map((resource) => ({
      path: resource.path,
      ...(resource.uid ? { uid: resource.uid } : {}),
    })),
  };
}

export function parseGodotResourceAst(content: string): GodotParsedResourceAst | null {
  try {
    return createResourceAst(parse(content));
  } catch {
    return null;
  }
}

export function readGodotResourceUid(content: string): string | null {
  return parseGodotResourceAst(content)?.uid ?? null;
}
