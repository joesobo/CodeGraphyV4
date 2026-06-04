import { describe, expect, it } from 'vitest';
import { createVuePlugin } from '../src/plugin';
import { createWorkspaceRoot, removeWorkspaceRoot, writeWorkspaceFile } from './workspace';

describe('Vue SFC analysis', () => {
  it('emits runtime import relationships from script setup and normal script blocks', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      const source = [
        '<script lang="ts">',
        "import UserCard from './components/UserCard.vue';",
        '</script>',
        '<script setup lang="ts">',
        "import CounterPanel from './components/CounterPanel.vue';",
        "import { sampleUser } from './data/users';",
        "import { useCounter } from './composables/useCounter';",
        '</script>',
      ].join('\n');
      const sourcePath = writeWorkspaceFile(workspaceRoot, 'src/App.vue', source);
      const userCardPath = writeWorkspaceFile(workspaceRoot, 'src/components/UserCard.vue', '<template />\n');
      const counterPanelPath = writeWorkspaceFile(workspaceRoot, 'src/components/CounterPanel.vue', '<template />\n');
      const usersPath = writeWorkspaceFile(workspaceRoot, 'src/data/users.ts', 'export const sampleUser = {};\n');
      const counterPath = writeWorkspaceFile(
        workspaceRoot,
        'src/composables/useCounter.ts',
        'export function useCounter(): void {}\n',
      );

      const result = await createVuePlugin().analyzeFile?.(sourcePath, source, workspaceRoot);

      expect(result?.relations).toEqual([
        {
          kind: 'import',
          sourceId: 'sfc-script-import',
          fromFilePath: sourcePath,
          toFilePath: userCardPath,
          resolvedPath: userCardPath,
          specifier: './components/UserCard.vue',
        },
        {
          kind: 'import',
          sourceId: 'sfc-script-import',
          fromFilePath: sourcePath,
          toFilePath: counterPanelPath,
          resolvedPath: counterPanelPath,
          specifier: './components/CounterPanel.vue',
        },
        {
          kind: 'import',
          sourceId: 'sfc-script-import',
          fromFilePath: sourcePath,
          toFilePath: usersPath,
          resolvedPath: usersPath,
          specifier: './data/users',
        },
        {
          kind: 'import',
          sourceId: 'sfc-script-import',
          fromFilePath: sourcePath,
          toFilePath: counterPath,
          resolvedPath: counterPath,
          specifier: './composables/useCounter',
        },
      ]);
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });

  it('emits type-import relationships from Vue SFC script blocks', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      const source = [
        '<script setup lang="ts">',
        "import type { CounterPanelProps } from '../types';",
        "import { type UserProfile, sampleUser } from '../data/users';",
        '</script>',
      ].join('\n');
      const sourcePath = writeWorkspaceFile(workspaceRoot, 'src/components/CounterPanel.vue', source);
      const typesPath = writeWorkspaceFile(workspaceRoot, 'src/types.ts', 'export interface CounterPanelProps {}\n');
      const usersPath = writeWorkspaceFile(
        workspaceRoot,
        'src/data/users.ts',
        'export interface UserProfile {}\nexport const sampleUser = {};\n',
      );

      const result = await createVuePlugin().analyzeFile?.(sourcePath, source, workspaceRoot);

      expect(result?.relations).toEqual([
        {
          kind: 'type-import',
          sourceId: 'sfc-script-type-import',
          fromFilePath: sourcePath,
          toFilePath: typesPath,
          resolvedPath: typesPath,
          specifier: '../types',
        },
        {
          kind: 'import',
          sourceId: 'sfc-script-import',
          fromFilePath: sourcePath,
          toFilePath: usersPath,
          resolvedPath: usersPath,
          specifier: '../data/users',
        },
      ]);
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });

  it('ignores package imports and malformed SFCs instead of emitting unresolved edges', async () => {
    const workspaceRoot = createWorkspaceRoot();
    try {
      const source = [
        '<script setup>',
        "import { defineComponent } from 'vue';",
        "import MissingWidget from './MissingWidget.vue';",
        '</script',
      ].join('\n');
      const sourcePath = writeWorkspaceFile(workspaceRoot, 'src/App.vue', source);

      const result = await createVuePlugin().analyzeFile?.(sourcePath, source, workspaceRoot);

      expect(result?.relations).toEqual([]);
    } finally {
      removeWorkspaceRoot(workspaceRoot);
    }
  });
});
