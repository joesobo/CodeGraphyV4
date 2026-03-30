/**
 * Static default color palette for built-in file extensions.
 *
 * These values back the current extension and webview defaults.
 */
export const FILE_TYPE_COLORS: Readonly<Record<string, string>> = Object.freeze({
  '.ts': '#93C5FD',    // Soft blue
  '.tsx': '#67E8F9',   // Soft cyan
  '.js': '#FDE68A',    // Soft yellow
  '.jsx': '#FDBA74',   // Soft peach
  '.css': '#F9A8D4',   // Soft pink
  '.scss': '#E879F9',  // Soft magenta
  '.json': '#86EFAC',  // Soft green
  '.md': '#CBD5E1',    // Soft gray
  '.html': '#FCA5A5',  // Soft coral
  '.svg': '#C4B5FD',   // Soft purple
}) satisfies Record<string, string>;

/**
 * Default color for file types not in {@link FILE_TYPE_COLORS}.
 * A neutral soft zinc gray that works on dark backgrounds.
 */
export const DEFAULT_NODE_COLOR = '#A1A1AA'; // Soft zinc

/** Default color for folder nodes in Folder View. Same as DEFAULT_NODE_COLOR. */
export const DEFAULT_FOLDER_NODE_COLOR = '#A1A1AA';

/** Default color for direction indicators (arrows/particles). */
export const DEFAULT_DIRECTION_COLOR = '#475569';
