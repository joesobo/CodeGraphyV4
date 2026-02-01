# Default Example

This is a minimal example workspace to test CodeGraphy's basic functionality.

It contains a mix of file types without any specific language plugin requirements.

## Files

- `config.json` - Configuration file
- `data.json` - Sample data
- `styles.css` - Stylesheet
- `index.html` - HTML page
- `notes.md` - Markdown notes

## Purpose

Tests that:
1. Files are discovered correctly
2. Non-code files appear as orphan nodes (when showOrphans is enabled)
3. Colors are assigned based on extension
4. Graph renders without any plugin-detected connections
