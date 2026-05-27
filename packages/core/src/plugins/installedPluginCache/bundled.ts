import { createMarkdownPlugin } from '@codegraphy-dev/plugin-markdown';
import { CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME } from '../../workspace/settings';
import type { CodeGraphyInstalledPluginRecord } from './contracts';

export function createBundledMarkdownInstalledPluginRecord(): CodeGraphyInstalledPluginRecord {
  const plugin = createMarkdownPlugin();
  return {
    package: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
    version: plugin.version,
    apiVersion: plugin.apiVersion,
    disclosures: [],
    packageRoot: '',
  };
}
