import type { GDScriptPathResolver } from '../PathResolver';

/** Types of GDScript references */
export type GDScriptReferenceType =
  | 'preload'
  | 'load'
  | 'extends'
  | 'class_name'
  | 'class_name_usage'
  | 'class_name_static_call';

/** Raw detected reference from GDScript */
export interface IGDScriptReference {
  /** The resource path as written (e.g., "res://scripts/player.gd") */
  resPath: string;
  /** Type of reference */
  referenceType: GDScriptReferenceType;
  /** Import type for the connection */
  importType: 'static' | 'dynamic';
  /** Line number (1-indexed) */
  line: number;
  /** Whether this is a class_name declaration (not an import) */
  isDeclaration?: boolean;
}

/** Shared context for GDScript sources */
export interface GDScriptRuleContext {
  resolver: GDScriptPathResolver;
  projectRoot?: string;
  workspaceRoot: string;
  relativeFilePath: string;
}

export interface GDScriptStatement {
  line: number;
  raw: string;
  code: string;
  trimmed: string;
}

export interface GDScriptDocument {
  statements: GDScriptStatement[];
}
