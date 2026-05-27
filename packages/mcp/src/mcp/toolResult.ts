export function renderToolText(result: unknown): string {
  return JSON.stringify(result, null, 2);
}

export function createToolResult<T extends Record<string, unknown>>(result: T) {
  return {
    structuredContent: result,
    content: [{ type: 'text' as const, text: renderToolText(result) }],
  };
}
