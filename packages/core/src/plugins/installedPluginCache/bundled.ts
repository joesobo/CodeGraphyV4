import { CODEGRAPHY_MARKDOWN_PLUGIN_METADATA } from '../markdown/metadata';
import type { CodeGraphyInstalledPluginRecord } from './contracts';

export function createBundledMarkdownInstalledPluginRecord(): CodeGraphyInstalledPluginRecord {
  return {
    package: CODEGRAPHY_MARKDOWN_PLUGIN_METADATA.packageName,
    version: CODEGRAPHY_MARKDOWN_PLUGIN_METADATA.version,
    id: CODEGRAPHY_MARKDOWN_PLUGIN_METADATA.id,
    name: CODEGRAPHY_MARKDOWN_PLUGIN_METADATA.name,
    host: 'core',
    entry: './dist/plugin.js',
    apiVersion: CODEGRAPHY_MARKDOWN_PLUGIN_METADATA.apiVersion,
    packageRoot: '',
    globallyEnabled: true,
  };
}
