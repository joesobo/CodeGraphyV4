import type { IPlugin } from '@codegraphy-dev/plugin-api';
import packageManifest from '../package.json';

const descriptor = packageManifest.codegraphy.plugins[0];

export const manifest = {
  id: descriptor.id,
  name: descriptor.name,
  version: packageManifest.version,
  apiVersion: descriptor.apiVersion,
  supportedExtensions: descriptor.data.supportedExtensions,
  defaultFilters: descriptor.data.defaultFilters,
  updateImpact: descriptor.data.updateImpact as IPlugin['updateImpact'],
} satisfies Pick<
  IPlugin,
  'id' | 'name' | 'version' | 'apiVersion' | 'supportedExtensions'
  | 'defaultFilters' | 'updateImpact'
>;
