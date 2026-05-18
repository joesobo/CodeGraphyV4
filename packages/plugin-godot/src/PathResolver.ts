/**
 * GDScript Path Resolver
 *
 * Resolves Godot resource paths (res://) to workspace-relative paths.
 * Also handles class_name lookups for global script references.
 */

import { isGodotResource, getSupportedExtensions } from './resource-utils';
import { isGDScriptFile, isGodotTextResourceFile } from './pathResolver/fileTypes';
import {
	isRelativeImport,
	isUnsupportedTextResourcePath,
	isUserResourcePath,
	resolveRelativePath,
	resolveResPath,
} from './pathResolver/paths';
import { GDScriptScriptRegistry } from './pathResolver/scriptRegistry';
import { GodotTextResourceRegistry } from './pathResolver/textResourceRegistry';

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
	private scripts = new GDScriptScriptRegistry();
	private textResources = new GodotTextResourceRegistry();

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
		this.scripts.registerClassName(className, filePath);
	}

	/**
	 * Register a discovered .gd file so class names without an explicit
	 * `class_name` declaration can be resolved via the snake_case convention.
	 */
	registerFile(filePath: string): void {
		if (isGDScriptFile(filePath)) {
			this.scripts.registerFile(filePath);
			return;
		}

		if (isGodotTextResourceFile(filePath)) {
			this.textResources.registerFile(filePath);
		}
	}

	/**
	 * Clear all registered class names and file entries.
	 */
	clearClassNames(): void {
		this.scripts.clear();
		this.textResources.clear();
	}

	replaceFileClassNames(filePath: string, classNames: readonly string[]): { changed: boolean } {
		return this.scripts.replaceFileClassNames(filePath, classNames);
	}

	replaceFileResourceUid(filePath: string, uid: string | null): { changed: boolean } {
		return this.textResources.replaceFileResourceUid(filePath, uid);
	}

	/**
	 * Resolve a Godot resource path to a workspace-relative path.
	 */
	resolve(importPath: string, fromFile: string): string | null {
		if (importPath.startsWith('res://')) {
			return resolveResPath(importPath);
		}

		if (isUserResourcePath(importPath)) {
			return null;
		}

		return this.scripts.resolveClassName(importPath)
			?? this.resolveRelativeImport(importPath, fromFile)
			?? this.scripts.resolveSnakeCaseFile(importPath);
	}

	resolveTextResourcePath(importPath: string, fromFile: string, uid?: string): string | null {
		const uidPath = this.textResources.resolveResourceUid(uid);
		if (uidPath) {
			return uidPath;
		}

		if (importPath.startsWith('res://')) {
			return resolveResPath(importPath);
		}

		if (isUnsupportedTextResourcePath(importPath)) {
			return null;
		}

		return resolveRelativePath(importPath, fromFile);
	}

	private resolveRelativeImport(importPath: string, fromFile: string): string | null {
		return isRelativeImport(importPath)
			? resolveRelativePath(importPath, fromFile)
			: null;
	}

	/**
	 * Get all registered class names and their file paths.
	 */
	getClassNameMap(): Map<string, string> {
		return this.scripts.getClassNameMap();
	}

	/**
	 * Get the snake_case file name map (for testing).
	 */
	getFileNameMap(): Map<string, string> {
		return this.scripts.getFileNameMap();
	}

	getRegisteredFiles(): string[] {
		return [...this.scripts.getRegisteredFiles(), ...this.textResources.getRegisteredFiles()];
	}

	getRegisteredTextResourceFiles(): string[] {
		return this.textResources.getRegisteredFiles();
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
