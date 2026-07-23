import type { IExtensionPlugin } from '@codegraphy-dev/extension-plugin-api';
import packageManifest from '../package.json';

const descriptor = packageManifest.codegraphy.plugins[0];

export const manifest = {
  id: descriptor.id,
  name: descriptor.name,
  version: packageManifest.version,
  apiVersion: descriptor.apiVersion,
} satisfies Pick<IExtensionPlugin, 'id' | 'name' | 'version' | 'apiVersion'>;
