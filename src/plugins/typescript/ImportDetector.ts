/**
 * @fileoverview TypeScript/JavaScript import detection using the TypeScript Compiler API.
 * Parses source files into an AST and extracts all import statements.
 * @module plugins/typescript/ImportDetector
 */

import * as ts from 'typescript';

/**
 * Represents a detected import in a source file.
 */
export interface IDetectedImport {
  /** The module specifier as written (e.g., './utils', 'lodash', '@scope/pkg') */
  specifier: string;
  /** The type of import statement */
  type: 'static' | 'dynamic' | 'require' | 'reexport';
  /** Line number where the import appears (1-indexed) */
  line: number;
}

/**
 * Detects imports in TypeScript/JavaScript source code using the TypeScript Compiler API.
 * 
 * This class parses source code into an Abstract Syntax Tree (AST) and walks it
 * to find all import statements. It supports:
 * - ES6 static imports: `import x from 'y'`
 * - Named imports: `import { a, b } from 'y'`
 * - Namespace imports: `import * as x from 'y'`
 * - Side-effect imports: `import 'y'`
 * - Dynamic imports: `import('y')`
 * - CommonJS require: `require('y')`
 * - Re-exports: `export { x } from 'y'`
 * 
 * Using the TypeScript Compiler API ensures accurate parsing that won't be
 * fooled by imports in comments or strings.
 * 
 * @example
 * ```typescript
 * const detector = new ImportDetector();
 * const imports = detector.detect(`
 *   import React from 'react';
 *   import { useState } from 'react';
 *   const lodash = require('lodash');
 * `);
 * // Returns:
 * // [
 * //   { specifier: 'react', type: 'static', line: 2 },
 * //   { specifier: 'react', type: 'static', line: 3 },
 * //   { specifier: 'lodash', type: 'require', line: 4 }
 * // ]
 * ```
 */
export class ImportDetector {
  /**
   * Detects all imports in the given source code.
   * 
   * @param content - The source code to analyze
   * @param fileName - Optional file name for better error messages (default: 'file.ts')
   * @returns Array of detected imports
   */
  detect(content: string, fileName = 'file.ts'): IDetectedImport[] {
    const imports: IDetectedImport[] = [];

    // Parse the source into an AST
    const sourceFile = ts.createSourceFile(
      fileName,
      content,
      ts.ScriptTarget.Latest,
      true, // setParentNodes - needed for traversal
      this._getScriptKind(fileName)
    );

    // Walk the AST
    const visit = (node: ts.Node): void => {
      // ES6 import declarations
      if (ts.isImportDeclaration(node)) {
        const specifier = this._getModuleSpecifier(node.moduleSpecifier);
        if (specifier) {
          imports.push({
            specifier,
            type: 'static',
            line: this._getLineNumber(sourceFile, node),
          });
        }
      }

      // Export declarations with a module specifier (re-exports)
      if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
        const specifier = this._getModuleSpecifier(node.moduleSpecifier);
        if (specifier) {
          imports.push({
            specifier,
            type: 'reexport',
            line: this._getLineNumber(sourceFile, node),
          });
        }
      }

      // Call expressions (require, dynamic import)
      if (ts.isCallExpression(node)) {
        // Dynamic import: import('module')
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          const arg = node.arguments[0];
          if (arg && ts.isStringLiteral(arg)) {
            imports.push({
              specifier: arg.text,
              type: 'dynamic',
              line: this._getLineNumber(sourceFile, node),
            });
          }
        }

        // CommonJS require: require('module')
        if (
          ts.isIdentifier(node.expression) &&
          node.expression.text === 'require' &&
          node.arguments.length > 0
        ) {
          const arg = node.arguments[0];
          if (ts.isStringLiteral(arg)) {
            imports.push({
              specifier: arg.text,
              type: 'require',
              line: this._getLineNumber(sourceFile, node),
            });
          }
        }
      }

      // Continue traversing
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return imports;
  }

  /**
   * Extracts the module specifier string from an AST node.
   */
  private _getModuleSpecifier(node: ts.Expression): string | null {
    if (ts.isStringLiteral(node)) {
      return node.text;
    }
    return null;
  }

  /**
   * Gets the 1-indexed line number for a node.
   */
  private _getLineNumber(sourceFile: ts.SourceFile, node: ts.Node): number {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    return line + 1; // Convert to 1-indexed
  }

  /**
   * Determines the script kind based on file extension.
   */
  private _getScriptKind(fileName: string): ts.ScriptKind {
    const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
    switch (ext) {
      case '.tsx':
        return ts.ScriptKind.TSX;
      case '.ts':
        return ts.ScriptKind.TS;
      case '.jsx':
        return ts.ScriptKind.JSX;
      case '.js':
      case '.mjs':
      case '.cjs':
        return ts.ScriptKind.JS;
      default:
        return ts.ScriptKind.TS;
    }
  }
}
