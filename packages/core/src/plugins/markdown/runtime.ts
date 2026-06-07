import type { IPlugin } from '@codegraphy-dev/plugin-api';

export async function loadBundledMarkdownPlugin(): Promise<IPlugin> {
  const { createMarkdownPlugin } = await import('@codegraphy-dev/plugin-markdown');
  return createMarkdownPlugin();
}
