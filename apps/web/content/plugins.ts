import type { Media } from '@/components/media-image';
import { githubTreeHref, npmPackageRootHref, pluginsHref } from './links';

export interface PluginContent {
  id: string;
  href: string;
  name: string;
  summary: string;
  supported: readonly string[];
  iconUrl: string;
  packageName: string;
  pluginId: string;
  sourceHref: string;
  npmHref: string;
  media?: Media;
}

export const pluginContent = [
  {
    id: 'typescript',
    href: `${pluginsHref}#typescript`,
    name: 'TypeScript',
    summary:
      'Core web app and library support for imports, exports, aliases, symbols, and inheritance Edges.',
    supported: ['imports', 'exports', 'path aliases', 'symbols', 'inheritance'],
    iconUrl: '/icons/typescript.svg',
    packageName: '@codegraphy-dev/plugin-typescript',
    pluginId: 'codegraphy.typescript',
    sourceHref: `${githubTreeHref}/packages/plugin-typescript`,
    npmHref: `${npmPackageRootHref}/@codegraphy-dev/plugin-typescript`,
  },
  {
    id: 'vue',
    href: `${pluginsHref}#vue`,
    name: 'Vue',
    summary:
      'Vue single-file component support for script blocks, component imports, type imports, and lazy component Edges.',
    supported: ['SFC scripts', 'component imports', 'type imports', 'lazy imports'],
    iconUrl: '/icons/vue.svg',
    packageName: '@codegraphy-dev/plugin-vue',
    pluginId: 'codegraphy.vue',
    sourceHref: `${githubTreeHref}/packages/plugin-vue`,
    npmHref: `${npmPackageRootHref}/@codegraphy-dev/plugin-vue`,
  },
  {
    id: 'svelte',
    href: `${pluginsHref}#svelte`,
    name: 'Svelte',
    summary:
      'Svelte component support for module scripts, instance scripts, type imports, and lazy module imports.',
    supported: ['components', 'module scripts', 'type imports', 'lazy imports'],
    iconUrl: '/icons/svelte.svg',
    packageName: '@codegraphy-dev/plugin-svelte',
    pluginId: 'codegraphy.svelte',
    sourceHref: `${githubTreeHref}/packages/plugin-svelte`,
    npmHref: `${npmPackageRootHref}/@codegraphy-dev/plugin-svelte`,
  },
  {
    id: 'godot',
    href: `${pluginsHref}#godot`,
    name: 'Godot',
    summary:
      'Godot project support for scenes, resources, autoloads, GDScript inheritance, and class_name symbols.',
    supported: ['scenes', 'resources', 'autoloads', 'GDScript', 'class_name'],
    iconUrl: '/icons/godot.svg',
    packageName: '@codegraphy-dev/plugin-godot',
    pluginId: 'codegraphy.gdscript',
    sourceHref: `${githubTreeHref}/packages/plugin-godot`,
    npmHref: `${npmPackageRootHref}/@codegraphy-dev/plugin-godot`,
  },
  {
    id: 'unity',
    href: `${pluginsHref}#unity`,
    name: 'Unity',
    summary:
      'Unity project support for scenes, prefabs, GameObjects, Components, ScriptableObjects, and resolved script references.',
    supported: ['scenes', 'prefabs', 'GameObjects', 'Components', 'ScriptableObjects'],
    iconUrl: '/icons/unity.svg',
    packageName: '@codegraphy-dev/plugin-unity',
    pluginId: 'codegraphy.unity',
    sourceHref: `${githubTreeHref}/packages/plugin-unity`,
    npmHref: `${npmPackageRootHref}/@codegraphy-dev/plugin-unity`,
  },
  {
    id: 'markdown',
    href: `${pluginsHref}#markdown`,
    name: 'Markdown',
    summary:
      'Document Relationship Graph support for Markdown links, wiki-style notes, mixed docs/code Relationships, and references.',
    supported: ['links', 'wikilinks', 'documents', 'references'],
    iconUrl: '/icons/markdown.svg',
    packageName: '@codegraphy-dev/plugin-markdown',
    pluginId: 'codegraphy.markdown',
    sourceHref: `${githubTreeHref}/packages/plugin-markdown`,
    npmHref: `${npmPackageRootHref}/@codegraphy-dev/plugin-markdown`,
  },
  {
    id: 'particles',
    href: `${pluginsHref}#particles`,
    name: 'Particles',
    summary:
      'Visual Relationship Graph background effects and Plugin-provided webview assets for customizing the graph stage.',
    supported: ['effects', 'presets', 'webview assets', 'Plugin API'],
    iconUrl: '/icons/shader.svg',
    packageName: '@codegraphy-dev/plugin-particles',
    pluginId: 'codegraphy.particles',
    sourceHref: `${githubTreeHref}/packages/plugin-particles`,
    npmHref: `${npmPackageRootHref}/@codegraphy-dev/plugin-particles`,
    media: {
      alt: 'Animation of the CodeGraphy particles Plugin rendering animated Relationship Graph background effects',
      src: '/media/features/themes-particles.gif',
      posterSrc: '/media/features/posters/themes-particles.png',
    },
  },
] satisfies readonly PluginContent[];
