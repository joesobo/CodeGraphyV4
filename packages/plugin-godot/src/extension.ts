import type { IExtensionPlugin } from '@codegraphy-dev/extension-plugin-api';
import packageManifest from '../package.json';

const descriptor = packageManifest.codegraphy.plugins.find(
  plugin => plugin.host === 'codegraphy.extension',
);

if (!descriptor) {
  throw new Error('Godot package is missing its Extension plugin descriptor.');
}

const extensionDescriptor = descriptor;

export function createGodotExtensionPlugin(): IExtensionPlugin {
  return {
    id: extensionDescriptor.id,
    name: extensionDescriptor.name,
    version: packageManifest.version,
    apiVersion: extensionDescriptor.apiVersion,
  };
}

export default createGodotExtensionPlugin;
