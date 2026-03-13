/**
 * @fileoverview Godot utility functions.
 * Extracted from PathResolver.ts to keep mutation sites per file under 50.
 * @module plugins/godot/godot-utils
 */

import * as path from 'path';

/**
 * Convert a PascalCase class name to snake_case file name.
 * e.g. "SpiritCapSpawner" → "spirit_cap_spawner"
 * e.g. "HTTPClient" → "http_client"
 */
export function toSnakeCase(name: string): string {
	return name
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
		.replace(/([a-z\d])([A-Z])/g, '$1_$2')
		.toLowerCase();
}

/**
 * Check if a path looks like it could be a Godot resource.
 */
export function isGodotResource(filePath: string): boolean {
	const ext = path.extname(filePath).toLowerCase();
	return [
		'.gd',
		'.tscn',
		'.tres',
		'.gdshader',
		'.gdns',
		'.gdnlib',
	].includes(ext);
}

/**
 * Get the file extensions this resolver handles.
 */
export function getSupportedExtensions(): string[] {
	return ['.gd', '.tscn', '.tres', '.gdshader'];
}
