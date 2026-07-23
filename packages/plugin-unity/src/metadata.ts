import type { IPlugin } from '@codegraphy-dev/plugin-api';
import packageManifest from '../package.json';

const descriptor = packageManifest.codegraphy.plugins.find(plugin => plugin.host === 'core');
const supportedExtensions = descriptor?.data?.supportedExtensions;

if (!descriptor || !supportedExtensions) {
  throw new Error('Unity package is missing its Core plugin descriptor.');
}

const coreDescriptor = descriptor;

export const manifest = {
  id: coreDescriptor.id,
  name: coreDescriptor.name,
  version: packageManifest.version,
  apiVersion: coreDescriptor.apiVersion,
  supportedExtensions,
  defaultFilters: coreDescriptor.data.defaultFilters,
  updateImpact: coreDescriptor.data.updateImpact as IPlugin['updateImpact'],
  sources: coreDescriptor.data.sources,
} satisfies Pick<
  IPlugin,
  'id' | 'name' | 'version' | 'apiVersion' | 'supportedExtensions'
  | 'defaultFilters' | 'updateImpact' | 'sources'
>;
