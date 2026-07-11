import { describe, expect, it } from 'vitest';
import { createSveltePlugin } from '../src/plugin';
import { createWorkspaceRoot, removeWorkspaceRoot, writeWorkspaceFile } from './workspace';

describe('Svelte component analysis', () => {
  it('emits import relationships from instance and module scripts', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      const source = [
        '<script context="module" lang="ts">',
        "import { loadFeature } from './loadFeature';",
        '</script>',
        '<script lang="ts">',
        "import UserCard from './components/UserCard.svelte';",
        "import type { UserProfile } from './types';",
        "const LazyPanel = () => import('./components/LazyPanel.svelte');",
        '</script>',
      ].join('\n');
      const sourcePath = writeWorkspaceFile(workspaceRoot, 'src/App.svelte', source);
      const loadFeaturePath = writeWorkspaceFile(
        workspaceRoot,
        'src/loadFeature.ts',
        'export function loadFeature(): void {}\n',
      );
      const userCardPath = writeWorkspaceFile(
        workspaceRoot,
        'src/components/UserCard.svelte',
        '<script>export let name;</script>\n',
      );
      const typesPath = writeWorkspaceFile(workspaceRoot, 'src/types.ts', 'export interface UserProfile {}\n');
      const lazyPanelPath = writeWorkspaceFile(
        workspaceRoot,
        'src/components/LazyPanel.svelte',
        '<template />\n',
      );

      const result = await createSveltePlugin().analyzeFile?.(sourcePath, source, workspaceRoot);

      expect(result?.relations).toEqual([
        {
          kind: 'import',
          sourceId: 'svelte-script-import',
          fromFilePath: sourcePath,
          toFilePath: loadFeaturePath,
          resolvedPath: loadFeaturePath,
          specifier: './loadFeature',
        },
        {
          kind: 'import',
          sourceId: 'svelte-script-import',
          fromFilePath: sourcePath,
          toFilePath: userCardPath,
          resolvedPath: userCardPath,
          specifier: './components/UserCard.svelte',
        },
        {
          kind: 'type-import',
          sourceId: 'svelte-script-type-import',
          fromFilePath: sourcePath,
          toFilePath: typesPath,
          resolvedPath: typesPath,
          specifier: './types',
        },
        {
          kind: 'import',
          sourceId: 'svelte-script-dynamic-import',
          fromFilePath: sourcePath,
          toFilePath: lazyPanelPath,
          resolvedPath: lazyPanelPath,
          specifier: './components/LazyPanel.svelte',
        },
      ]);
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  }, 15_000);

  it('ignores script-like text outside compiler script nodes', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      const source = [
        '<script lang="ts">',
        "import UserCard from './components/UserCard.svelte';",
        '</script>',
        '<!-- <script>import Phantom from "./Phantom.svelte";</script> -->',
        '<p>{"<script>import Ghost from \\"./Ghost.svelte\\";</script>"}</p>',
      ].join('\n');
      const sourcePath = writeWorkspaceFile(workspaceRoot, 'src/App.svelte', source);
      const userCardPath = writeWorkspaceFile(
        workspaceRoot,
        'src/components/UserCard.svelte',
        '<script>export let name;</script>\n',
      );
      writeWorkspaceFile(workspaceRoot, 'src/Phantom.svelte', '<script></script>\n');
      writeWorkspaceFile(workspaceRoot, 'src/Ghost.svelte', '<script></script>\n');

      const result = await createSveltePlugin().analyzeFile?.(sourcePath, source, workspaceRoot);

      expect(result?.relations).toEqual([
        {
          kind: 'import',
          sourceId: 'svelte-script-import',
          fromFilePath: sourcePath,
          toFilePath: userCardPath,
          resolvedPath: userCardPath,
          specifier: './components/UserCard.svelte',
        },
      ]);
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });

  it('emits call relationships when Svelte scripts call imported functions', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      const source = [
        '<script context="module" lang="ts">',
        "import { loadFeature } from './loadFeature';",
        '</script>',
        '<script lang="ts">',
        "import UserCard from './components/UserCard.svelte';",
        'const feature = loadFeature();',
        '</script>',
        '<UserCard />',
      ].join('\n');
      const sourcePath = writeWorkspaceFile(workspaceRoot, 'src/App.svelte', source);
      const loadFeaturePath = writeWorkspaceFile(
        workspaceRoot,
        'src/loadFeature.ts',
        'export function loadFeature(): void {}\n',
      );
      const userCardPath = writeWorkspaceFile(
        workspaceRoot,
        'src/components/UserCard.svelte',
        '<script>export let name;</script>\n',
      );

      const result = await createSveltePlugin().analyzeFile?.(sourcePath, source, workspaceRoot);

      expect(result?.relations).toEqual([
        {
          kind: 'import',
          sourceId: 'svelte-script-import',
          fromFilePath: sourcePath,
          toFilePath: loadFeaturePath,
          resolvedPath: loadFeaturePath,
          specifier: './loadFeature',
        },
        {
          kind: 'import',
          sourceId: 'svelte-script-import',
          fromFilePath: sourcePath,
          toFilePath: userCardPath,
          resolvedPath: userCardPath,
          specifier: './components/UserCard.svelte',
        },
        {
          kind: 'call',
          sourceId: 'svelte-script-call',
          fromFilePath: sourcePath,
          toFilePath: loadFeaturePath,
          resolvedPath: loadFeaturePath,
          specifier: './loadFeature',
          metadata: {
            importedName: 'loadFeature',
            localName: 'loadFeature',
          },
        },
      ]);
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });
});
