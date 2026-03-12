/**
 * @fileoverview Shared types and utilities for GDScript rule modules.
 * Contains reference types and helper functions extracted from the
 * monolithic ImportDetector.
 * @module plugins/godot/parser
 */

import type { GDScriptPathResolver } from './PathResolver';

/** Types of GDScript references */
export type GDScriptReferenceType = 'preload' | 'load' | 'extends' | 'class_name' | 'class_name_usage';

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

/** Shared context for GDScript rules */
export interface GDScriptRuleContext {
  resolver: GDScriptPathResolver;
  workspaceRoot: string;
  relativeFilePath: string;
}

/**
 * Check if a path is a Godot resource path (res:// or user://).
 */
export function isResPath(resourcePath: string): boolean {
  return resourcePath.startsWith('res://') || resourcePath.startsWith('user://');
}

/**
 * Detect class_name declarations (not imports -- used for building the class_name map).
 */
export function detectClassNameDeclaration(line: string, lineNumber: number): IGDScriptReference | null {
  const match = line.trim().match(/^class_name\s+(\w+)/);
  if (match) {
    return {
      resPath: match[1],
      referenceType: 'class_name',
      importType: 'static',
      line: lineNumber,
      isDeclaration: true,
    };
  }
  return null;
}
