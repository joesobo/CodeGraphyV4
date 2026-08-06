#!/usr/bin/env node

import { createInterface } from 'node:readline';

const coreModuleUrl = process.env.CODEGRAPHY_DESKTOP_CORE_MODULE
  ? new URL(`file://${process.env.CODEGRAPHY_DESKTOP_CORE_MODULE}`)
  : new URL('./core/dist/index.js', import.meta.url);
const core = await import(coreModuleUrl.href);

function write(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseRequest(value) {
  if (!isObject(value) || value.kind !== 'request' || typeof value.id !== 'number') {
    throw new Error('Core request must have kind "request" and a numeric id.');
  }
  if ((value.method !== 'open' && value.method !== 'index') || !isObject(value.params)) {
    throw new Error('Core request method must be "open" or "index".');
  }
  if (typeof value.params.workspaceRoot !== 'string' || value.params.workspaceRoot.length === 0) {
    throw new Error('Core request requires params.workspaceRoot.');
  }
  return {
    id: value.id,
    includeSymbols: value.params.includeSymbols === true,
    method: value.method,
    workspaceRoot: value.params.workspaceRoot,
  };
}

function graphRequest(request) {
  return {
    workspacePath: request.workspaceRoot,
    ...(request.includeSymbols
      ? { projection: { nodeTypes: ['file', 'folder', 'symbol'] } }
      : {}),
  };
}

function indexResult(result, graph) {
  if (graph.kind !== 'ready') {
    throw new Error('Core did not return the Graph Cache after Indexing.');
  }
  return {
    ...graph,
    indexing: result.indexing,
    discovery: {
      indexedFiles: result.files.length,
      totalFound: result.totalFound,
      limitReached: result.limitReached,
    },
  };
}

async function runRequest(request) {
  if (request.method === 'open') {
    const cached = core.requestCodeGraphyWorkspaceGraph(graphRequest(request));
    if (cached.kind === 'ready' || cached.kind === 'unreadable') return cached;
  }

  write({
    kind: 'event',
    event: 'indexing',
    workspaceRoot: request.workspaceRoot,
  });
  const result = await core.indexCodeGraphyWorkspace({
    workspaceRoot: request.workspaceRoot,
  });
  return indexResult(result, core.requestCodeGraphyWorkspaceGraph(graphRequest(request)));
}

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of lines) {
  let requestId = null;
  try {
    const request = parseRequest(JSON.parse(line));
    requestId = request.id;
    const result = await runRequest(request);
    write({ kind: 'response', id: request.id, outcome: 'success', result });
  } catch (error) {
    write({
      kind: 'response',
      id: requestId,
      outcome: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
