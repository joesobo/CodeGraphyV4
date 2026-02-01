/**
 * @fileoverview Dynamic color palette generation and management.
 * Generates distinct colors for file extensions with plugin and user overrides.
 * @module core/colors/ColorPaletteManager
 */

import distinctColors from 'distinct-colors';
import { minimatch } from 'minimatch';

/**
 * Color source priority levels (highest to lowest).
 */
export type ColorSource = 'user' | 'plugin' | 'generated';

/**
 * Information about a color assignment.
 */
export interface IColorInfo {
  /** The hex color string */
  color: string;
  /** Where this color came from */
  source: ColorSource;
}

/**
 * Options for color generation.
 */
export interface IColorGenerationOptions {
  /** Minimum lightness (0-100). Default: 60 */
  lightMin?: number;
  /** Maximum lightness (0-100). Default: 85 */
  lightMax?: number;
  /** Minimum chroma/saturation (0-100). Default: 40 */
  chromaMin?: number;
  /** Maximum chroma/saturation (0-100). Default: 70 */
  chromaMax?: number;
}

/**
 * Default color for unknown extensions when no generation is possible.
 */
export const DEFAULT_FALLBACK_COLOR = '#A1A1AA'; // Soft zinc

/**
 * Manages dynamic color palette generation with layered overrides.
 * 
 * Color priority (highest to lowest):
 * 1. User settings - User-defined colors for specific extensions
 * 2. Plugin colors - Plugins can declare colors for their supported extensions
 * 3. Runtime generated - Auto-generate distinct colors for remaining extensions
 * 
 * User colors support multiple formats:
 * - Extensions: `.ts`, `.md`
 * - Exact filenames: `.gitignore`, `Makefile`, `Dockerfile`
 * - Glob patterns: `*.test.ts` (with double star prefix for recursive)
 * 
 * @example
 * ```typescript
 * const manager = new ColorPaletteManager();
 * 
 * // Add plugin colors (extensions only)
 * manager.setPluginColors({ '.gd': '#A5B4FC', '.tscn': '#6EE7B7' });
 * 
 * // Add user overrides (extensions, filenames, or patterns)
 * manager.setUserColors({
 *   '.ts': '#3B82F6',       // Extension
 *   '.gitignore': '#6B7280' // Exact filename
 * });
 * 
 * // Generate palette for discovered extensions
 * manager.generateForExtensions(['.ts', '.js', '.gd', '.json', '.md']);
 * 
 * // Get color for a file path
 * const color = manager.getColorForFile('src/utils.test.ts');
 * ```
 */
export class ColorPaletteManager {
  private generatedColors: Map<string, string> = new Map();
  /** Plugin extension colors (normalized, e.g., '.ts') */
  private pluginExtensionColors: Map<string, string> = new Map();
  /** Plugin pattern colors (raw patterns, e.g., 'Makefile', '.gitignore') */
  private pluginPatternColors: Map<string, string> = new Map();
  /** User extension colors (normalized, e.g., '.ts') */
  private userExtensionColors: Map<string, string> = new Map();
  /** User pattern colors (raw patterns, e.g., 'Makefile', '.gitignore') */
  private userPatternColors: Map<string, string> = new Map();
  private generationOptions: IColorGenerationOptions;

  constructor(options: IColorGenerationOptions = {}) {
    this.generationOptions = {
      lightMin: options.lightMin ?? 60,
      lightMax: options.lightMax ?? 85,
      chromaMin: options.chromaMin ?? 40,
      chromaMax: options.chromaMax ?? 70,
    };
  }

  /**
   * Set plugin-defined colors.
   * These override generated colors but are overridden by user colors.
   * 
   * Supports same formats as user colors:
   * - Extensions: `.ts`, `.md`
   * - Exact filenames: `.gitignore`, `Makefile`
   * - Glob patterns: Patterns with `*` or `/`
   * 
   * @param colors - Map of pattern/extension to hex color
   */
  setPluginColors(colors: Record<string, string>): void {
    this.pluginExtensionColors.clear();
    this.pluginPatternColors.clear();
    
    for (const [pattern, color] of Object.entries(colors)) {
      if (this.isExtension(pattern)) {
        const normalizedExt = this.normalizeExtension(pattern);
        this.pluginExtensionColors.set(normalizedExt, color);
      } else {
        this.pluginPatternColors.set(pattern, color);
      }
    }
  }

  /**
   * Add plugin colors (merges with existing).
   * 
   * @param colors - Map of pattern/extension to hex color
   */
  addPluginColors(colors: Record<string, string>): void {
    for (const [pattern, color] of Object.entries(colors)) {
      if (this.isExtension(pattern)) {
        const normalizedExt = this.normalizeExtension(pattern);
        this.pluginExtensionColors.set(normalizedExt, color);
      } else {
        this.pluginPatternColors.set(pattern, color);
      }
    }
  }

  /**
   * Set user-defined colors.
   * These have highest priority and override all other colors.
   * 
   * Supports:
   * - Extensions: `.ts`, `.md` (start with dot, no path separators)
   * - Exact filenames: `.gitignore`, `Makefile` (no path separators)
   * - Glob patterns: Patterns with `*` or `/` for matching paths
   * 
   * @param colors - Map of pattern/extension to hex color
   */
  setUserColors(colors: Record<string, string>): void {
    this.userExtensionColors.clear();
    this.userPatternColors.clear();
    
    for (const [pattern, color] of Object.entries(colors)) {
      if (this.isExtension(pattern)) {
        // Simple extension like '.ts', '.md'
        const normalizedExt = this.normalizeExtension(pattern);
        this.userExtensionColors.set(normalizedExt, color);
      } else {
        // Pattern or filename like '.gitignore', '**/*.test.ts', 'Makefile'
        this.userPatternColors.set(pattern, color);
      }
    }
  }
  
  /**
   * Check if a pattern is a simple extension (e.g., '.ts', 'ts')
   * vs a filename/pattern (e.g., '.gitignore', glob patterns)
   */
  private isExtension(pattern: string): boolean {
    // Contains glob characters or path separators = pattern
    if (pattern.includes('*') || pattern.includes('/') || pattern.includes('\\')) {
      return false;
    }
    // Starts with dot and has more characters after = could be extension OR dotfile
    if (pattern.startsWith('.') && pattern.length > 1) {
      // If it has no other dots, it's likely a dotfile like .gitignore
      // If the part after the first dot is short (1-4 chars), it's likely an extension
      const afterDot = pattern.slice(1);
      if (!afterDot.includes('.') && afterDot.length <= 4) {
        return true; // .ts, .tsx, .js, .md, etc.
      }
      return false; // .gitignore, .eslintrc, etc.
    }
    // No dot = likely a filename like 'Makefile'
    return false;
  }

  /**
   * Generate distinct colors for a set of extensions.
   * Extensions are sorted alphabetically for deterministic color assignment.
   * 
   * @param extensions - Array of file extensions (with or without leading dot)
   */
  generateForExtensions(extensions: string[]): void {
    // Normalize and deduplicate
    const uniqueExtensions = [...new Set(
      extensions.map(ext => this.normalizeExtension(ext))
    )].sort();

    if (uniqueExtensions.length === 0) {
      return;
    }

    // Generate distinct colors
    const palette = distinctColors({
      count: uniqueExtensions.length,
      lightMin: this.generationOptions.lightMin,
      lightMax: this.generationOptions.lightMax,
      chromaMin: this.generationOptions.chromaMin,
      chromaMax: this.generationOptions.chromaMax,
    });

    // Map extensions to colors (alphabetical order = deterministic)
    this.generatedColors.clear();
    uniqueExtensions.forEach((ext, index) => {
      this.generatedColors.set(ext, palette[index].hex());
    });
  }

  /**
   * Get the color for a file by its path.
   * Priority: User patterns > Plugin patterns > Extension colors
   * 
   * @param filePath - Workspace-relative file path (e.g., 'src/utils.ts', '.gitignore')
   * @returns Hex color string
   */
  getColorForFile(filePath: string): string {
    // Normalize path separators for matching
    const normalizedPath = filePath.replace(/\\/g, '/');
    const fileName = normalizedPath.split('/').pop() || normalizedPath;
    
    // Priority 1: User patterns (highest)
    for (const [pattern, color] of this.userPatternColors) {
      if (pattern === fileName || minimatch(normalizedPath, pattern, { dot: true })) {
        return color;
      }
    }
    
    // Priority 2: Plugin patterns
    for (const [pattern, color] of this.pluginPatternColors) {
      if (pattern === fileName || minimatch(normalizedPath, pattern, { dot: true })) {
        return color;
      }
    }
    
    // Fall back to extension-based color
    const ext = this.getExtension(normalizedPath);
    return this.getColor(ext);
  }

  /**
   * Get the color for a file extension.
   * Checks user extension colors, then plugin colors, then generated colors.
   * 
   * For full path matching (including patterns and filenames), use getColorForFile().
   * 
   * @param extension - File extension (with or without leading dot)
   * @returns Hex color string
   */
  getColor(extension: string): string {
    const normalizedExt = this.normalizeExtension(extension);
    
    // Priority 1: User extension colors
    const userColor = this.userExtensionColors.get(normalizedExt);
    if (userColor) {
      return userColor;
    }

    // Priority 2: Plugin extension colors
    const pluginColor = this.pluginExtensionColors.get(normalizedExt);
    if (pluginColor) {
      return pluginColor;
    }

    // Priority 3: Generated colors
    const generatedColor = this.generatedColors.get(normalizedExt);
    if (generatedColor) {
      return generatedColor;
    }

    // Fallback
    return DEFAULT_FALLBACK_COLOR;
  }
  
  /**
   * Extract extension from a file path.
   */
  private getExtension(filePath: string): string {
    const fileName = filePath.split('/').pop() || filePath;
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot > 0) { // > 0 to exclude dotfiles like .gitignore
      return fileName.slice(lastDot);
    }
    return '';
  }

  /**
   * Get color info for a file path, including the source.
   * 
   * @param filePath - Workspace-relative file path
   * @returns Color info with source
   */
  getColorInfoForFile(filePath: string): IColorInfo {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const fileName = normalizedPath.split('/').pop() || normalizedPath;
    
    // Check user patterns
    for (const [pattern, color] of this.userPatternColors) {
      if (pattern === fileName || minimatch(normalizedPath, pattern, { dot: true })) {
        return { color, source: 'user' };
      }
    }
    
    // Check plugin patterns
    for (const [pattern, color] of this.pluginPatternColors) {
      if (pattern === fileName || minimatch(normalizedPath, pattern, { dot: true })) {
        return { color, source: 'plugin' };
      }
    }
    
    // Fall back to extension
    const ext = this.getExtension(normalizedPath);
    return this.getColorInfo(ext);
  }

  /**
   * Get color info for an extension, including the source.
   * 
   * @param extension - File extension (with or without leading dot)
   * @returns Color info with source
   */
  getColorInfo(extension: string): IColorInfo {
    const normalizedExt = this.normalizeExtension(extension);
    
    const userColor = this.userExtensionColors.get(normalizedExt);
    if (userColor) {
      return { color: userColor, source: 'user' };
    }

    const pluginColor = this.pluginExtensionColors.get(normalizedExt);
    if (pluginColor) {
      return { color: pluginColor, source: 'plugin' };
    }

    const generatedColor = this.generatedColors.get(normalizedExt);
    if (generatedColor) {
      return { color: generatedColor, source: 'generated' };
    }

    return { color: DEFAULT_FALLBACK_COLOR, source: 'generated' };
  }

  /**
   * Get the full color map (extensions and patterns to colors).
   * Useful for sending to webview.
   * 
   * @returns Record of extension/pattern to hex color
   */
  getColorMap(): Record<string, string> {
    const map: Record<string, string> = {};
    
    // Start with generated colors (lowest priority)
    for (const [ext, color] of this.generatedColors) {
      map[ext] = color;
    }
    
    // Override with plugin extension colors
    for (const [ext, color] of this.pluginExtensionColors) {
      map[ext] = color;
    }
    
    // Add plugin pattern colors
    for (const [pattern, color] of this.pluginPatternColors) {
      map[pattern] = color;
    }
    
    // Override with user extension colors
    for (const [ext, color] of this.userExtensionColors) {
      map[ext] = color;
    }
    
    // Add user pattern colors (highest priority)
    for (const [pattern, color] of this.userPatternColors) {
      map[pattern] = color;
    }
    
    return map;
  }

  /**
   * Clear all colors.
   */
  clear(): void {
    this.generatedColors.clear();
    this.pluginExtensionColors.clear();
    this.pluginPatternColors.clear();
    this.userExtensionColors.clear();
    this.userPatternColors.clear();
  }

  /**
   * Normalize extension to lowercase with leading dot.
   */
  private normalizeExtension(extension: string): string {
    const trimmed = extension.trim().toLowerCase();
    return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
  }
}
