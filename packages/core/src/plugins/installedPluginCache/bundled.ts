import { CODEGRAPHY_MARKDOWN_PLUGIN_METADATA } from '../markdown/metadata';
import type { CodeGraphyInstalledPluginRecord } from './contracts';

export function createBundledMarkdownInstalledPluginRecord(): CodeGraphyInstalledPluginRecord {
  return {
    package: CODEGRAPHY_MARKDOWN_PLUGIN_METADATA.packageName,
    version: CODEGRAPHY_MARKDOWN_PLUGIN_METADATA.version,
    apiVersion: CODEGRAPHY_MARKDOWN_PLUGIN_METADATA.apiVersion,
    pluginId: CODEGRAPHY_MARKDOWN_PLUGIN_METADATA.id,
    pluginName: CODEGRAPHY_MARKDOWN_PLUGIN_METADATA.name,
    supportedExtensions: [...CODEGRAPHY_MARKDOWN_PLUGIN_METADATA.supportedExtensions],
    updateImpact: { ...CODEGRAPHY_MARKDOWN_PLUGIN_METADATA.updateImpact },
    disclosures: [...CODEGRAPHY_MARKDOWN_PLUGIN_METADATA.disclosures],
    packageRoot: '',
    globallyEnabled: true,
  };
}
