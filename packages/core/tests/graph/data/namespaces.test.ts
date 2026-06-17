import { describe, expect, it } from 'vitest';
import { buildWorkspaceGraphDataFromAnalysis } from '../../../src/graph/data';
import { createPlugin, SYMBOL_NODE_VISIBILITY } from './fixture';


describe('core/graph/data symbol names', () => {
  it('projects one canonical namespace node for repeated namespace declarations', () => {
    const graph = buildWorkspaceGraphDataFromAnalysis({
      cacheFiles: {
        'src/task.cpp': { size: 20 },
        'src/task.hpp': { size: 10 },
        'src/seed.hpp': { size: 10 },
        'src/task_queue.hpp': { size: 30 },
      },
      disabledPlugins: new Set(),
      fileAnalysis: new Map([
        ['/workspace/src/task.cpp', {
          filePath: '/workspace/src/task.cpp',
          symbols: [
            {
              id: '/workspace/src/task.cpp:namespace:taskrunner',
              filePath: '/workspace/src/task.cpp',
              kind: 'namespace',
              name: 'taskrunner',
            },
            {
              id: '/workspace/src/task.cpp:method:Task::id',
              filePath: '/workspace/src/task.cpp',
              kind: 'method',
              name: 'Task::id',
            },
          ],
          relations: [
            {
              kind: 'include',
              sourceId: 'test',
              fromFilePath: '/workspace/src/task.cpp',
              specifier: 'task.hpp',
              resolvedPath: '/workspace/src/task.hpp',
              toFilePath: '/workspace/src/task.hpp',
            },
          ],
        }],
        ['/workspace/src/seed.hpp', {
          filePath: '/workspace/src/seed.hpp',
          symbols: [
            {
              id: '/workspace/src/seed.hpp:namespace:taskrunner',
              filePath: '/workspace/src/seed.hpp',
              kind: 'namespace',
              name: 'taskrunner',
            },
          ],
          relations: [
            {
              kind: 'include',
              sourceId: 'test',
              fromFilePath: '/workspace/src/seed.hpp',
              specifier: 'task.hpp',
              resolvedPath: '/workspace/src/task.hpp',
              toFilePath: '/workspace/src/task.hpp',
            },
          ],
        }],
        ['/workspace/src/task.hpp', {
          filePath: '/workspace/src/task.hpp',
          symbols: [
            {
              id: '/workspace/src/task.hpp:namespace:taskrunner',
              filePath: '/workspace/src/task.hpp',
              kind: 'namespace',
              name: 'taskrunner',
            },
            {
              id: '/workspace/src/task.hpp:alias:TaskId',
              filePath: '/workspace/src/task.hpp',
              kind: 'alias',
              name: 'TaskId',
            },
          ],
          relations: [],
        }],
        ['/workspace/src/task_queue.hpp', {
          filePath: '/workspace/src/task_queue.hpp',
          symbols: [
            {
              id: '/workspace/src/task_queue.hpp:namespace:taskrunner',
              filePath: '/workspace/src/task_queue.hpp',
              kind: 'namespace',
              name: 'taskrunner',
            },
            {
              id: '/workspace/src/task_queue.hpp:template:TaskQueue',
              filePath: '/workspace/src/task_queue.hpp',
              kind: 'template',
              name: 'TaskQueue',
            },
            {
              id: '/workspace/src/task_queue.hpp:method:TaskQueue::push',
              filePath: '/workspace/src/task_queue.hpp',
              kind: 'method',
              name: 'TaskQueue::push',
            },
          ],
          relations: [
            {
              kind: 'include',
              sourceId: 'test',
              fromFilePath: '/workspace/src/task_queue.hpp',
              specifier: 'task.hpp',
              resolvedPath: '/workspace/src/task.hpp',
              toFilePath: '/workspace/src/task.hpp',
            },
          ],
        }],
      ]),
      showOrphans: true,
      churnCounts: {},
      nodeVisibility: {
        symbol: true,
        'symbol:namespace': true,
      },
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('codegraphy.cpp'),
    });

    expect(graph.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'src/task.hpp#taskrunner:namespace',
        label: 'taskrunner',
        symbol: expect.objectContaining({
          filePath: 'src/task.hpp',
          kind: 'namespace',
          name: 'taskrunner',
        }),
      }),
    ]));
    expect(graph.nodes).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'src/task.cpp#taskrunner:namespace',
      }),
      expect.objectContaining({
        id: 'src/seed.hpp#taskrunner:namespace',
      }),
      expect.objectContaining({
        id: 'src/task_queue.hpp#taskrunner:namespace',
      }),
    ]));
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        from: 'src/task.hpp',
        to: 'src/task.hpp#taskrunner:namespace',
        kind: 'contains',
      }),
    ]));
  });

  it('adds deterministic suffixes for duplicate symbols without signatures', () => {
    const graph = buildWorkspaceGraphDataFromAnalysis({
      cacheFiles: {
        'src/app.ts': { size: 20 },
      },
      disabledPlugins: new Set(),
      fileAnalysis: new Map([
        ['src/app.ts', {
          filePath: '/workspace/src/app.ts',
          symbols: [
            {
              id: 'first-run',
              filePath: '/workspace/src/app.ts',
              kind: 'function',
              name: 'run',
            },
            {
              id: 'second-run',
              filePath: '/workspace/src/app.ts',
              kind: 'function',
              name: 'run',
            },
          ],
          relations: [],
        }],
      ]),
      showOrphans: true,
      churnCounts: {},
      nodeVisibility: SYMBOL_NODE_VISIBILITY,
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('codegraphy.typescript'),
    });

    expect(graph.nodes.map((item) => item.id)).toEqual([
      'src/app.ts',
      'src/app.ts#run:function',
      'src/app.ts#run:function:2',
    ]);
  });
});
