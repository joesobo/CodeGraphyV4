/**
 * GDScript Path Resolver
 *
 * Resolves Godot resource paths (res://) to workspace-relative paths.
 * Also handles class_name lookups for global script references.
 */

import * as path from 'path';
import { normalizePath } from './parser';
import { toSnakeCase, isGodotResource, getSupportedExtensions } from './resource-utils';

/**
 * Resolves Godot resource paths to workspace-relative file paths.
 *
 * @example
 * ```typescript
 * const resolver = new GDScriptPathResolver('/workspace/my-game');
 * const resolved = resolver.resolve('res://scripts/player.gd', 'scenes/main.gd');
 * // Returns: 'scripts/player.gd'
 * ```
 */
export class GDScriptPathResolver {
	private classNameMap: Map<string, string> = new Map();
	/** Maps snake_case base name → workspace-relative path for .gd files */
	private fileNameMap: Map<string, string> = new Map();
	private fileClassNames: Map<string, Set<string>> = new Map();

	/**
	 * Create a new path resolver.
	 *
	 * @param _workspaceRoot - Absolute path to the workspace/project root (reserved for future use)
	 */
	constructor(_workspaceRoot: string) {
		// workspaceRoot reserved for future features like absolute path validation
	}

	/**
	 * Register a class_name declaration for reverse lookups.
	 */
	registerClassName(className: string, filePath: string): void {
		this.classNameMap.set(className, filePath);
		const classNames = this.fileClassNames.get(filePath) ?? new Set<string>();
		classNames.add(className);
		this.fileClassNames.set(filePath, classNames);
	}

	/**
	 * Register a discovered .gd file so class names without an explicit
	 * `class_name` declaration can be resolved via the snake_case convention.
	 */
	registerFile(filePath: string): void {
		if (!filePath.endsWith('.gd')) return;
		const base = path.basename(filePath, '.gd');
		this.fileNameMap.set(base, filePath);
	}

	/**
	 * Clear all registered class names and file entries.
	 */
	clearClassNames(): void {
		this.classNameMap.clear();
		this.fileNameMap.clear();
		this.fileClassNames.clear();
	}

	replaceFileClassNames(filePath: string, classNames: readonly string[]): { changed: boolean } {
		const previous = this.fileClassNames.get(filePath) ?? new Set<string>();
		const next = new Set(classNames);
		const changed =
			previous.size !== next.size || [...previous].some((className) => !next.has(className));

		for (const className of previous) {
			if (this.classNameMap.get(className) === filePath) {
				this.classNameMap.delete(className);
			}
		}

		if (next.size === 0) {
			this.fileClassNames.delete(filePath);
		} else {
			this.fileClassNames.set(filePath, next);
			for (const className of next) {
				this.classNameMap.set(className, filePath);
			}
		}

		return { changed };
	}

	/**
	 * Resolve a Godot resource path to a workspace-relative path.
	 */
	resolve(importPath: string, fromFile: string): string | null {
		if (importPath.startsWith('res://')) {
			return this.resolveResPath(importPath);
		}

		if (importPath.startsWith('user://')) {
			return null;
		}

		if (this.classNameMap.has(importPath)) {
			return this.classNameMap.get(importPath) || null;
		}

		if (importPath.startsWith('./') || importPath.startsWith('../')) {
			return this.resolveRelativePath(importPath, fromFile);
		}

		const snakeName = toSnakeCase(importPath);
		if (this.fileNameMap.has(snakeName)) {
			return this.fileNameMap.get(snakeName) || null;
		}

		return null;
	}

	private resolveResPath(resPath: string): string {
		const relativePath = resPath.slice('res://'.length);
		return normalizePath(relativePath);
	}

	private resolveRelativePath(importPath: string, fromFile: string): string {
		const fromDir = path.dirname(fromFile);
		const resolved = path.join(fromDir, importPath);
		return normalizePath(resolved);
	}

	/**
	 * Get all registered class names and their file paths.
	 */
	getClassNameMap(): Map<string, string> {
		return new Map(this.classNameMap);
	}

	/**
	 * Get the snake_case file name map (for testing).
	 */
	getFileNameMap(): Map<string, string> {
		return new Map(this.fileNameMap);
	}

	getRegisteredFiles(): string[] {
		return [...this.fileNameMap.values()];
	}

	/**
	 * Check if a path looks like it could be a Godot resource.
	 */
	static isGodotResource(filePath: string): boolean {
		return isGodotResource(filePath);
	}

	/**
	 * Get the file extensions this resolver handles.
	 */
	static getSupportedExtensions(): string[] {
		return getSupportedExtensions();
	}
}
