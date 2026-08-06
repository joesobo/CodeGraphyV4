#!/usr/bin/env node

import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';

const coreModuleUrl = process.env.CODEGRAPHY_DESKTOP_CORE_MODULE
  ? pathToFileURL(process.env.CODEGRAPHY_DESKTOP_CORE_MODULE)
  : new URL('./core/dist/index.js', import.meta.url);
const core = await import(coreModuleUrl.href);

function write(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseRequest(value) {
  if (!isObject(value) || value.kind !== 'request' || !Number.isSafeInteger(value.id) || value.id < 0) {
    throw new Error('Core request must have kind "request" and a non-negative safe integer id.');
  }
  if (!['open', 'index', 'update'].includes(value.method) || !isObject(value.params)) {
    throw new Error('Core request method must be "open", "index", or "update".');
  }
  if (typeof value.params.workspaceRoot !== 'string' || value.params.workspaceRoot.length === 0) {
    throw new Error('Core request requires params.workspaceRoot.');
  }
  if (value.method === 'update' && (
    typeof value.params.relativePath !== 'string' || value.params.relativePath.length === 0
  )) {
    throw new Error('Core update request requires params.relativePath.');
  }
  return {
    id: value.id,
    method: value.method,
    relativePath: value.params.relativePath,
    workspaceRoot: value.params.workspaceRoot,
  };
}

let activeEngine;

async function disposeActiveEngine() {
  if (!activeEngine) return;
  const previous = activeEngine;
  activeEngine = undefined;
  await previous.ready.catch(() => undefined);
  previous.engine.dispose();
}

function startWorkspaceEngine(workspaceRoot) {
  if (activeEngine?.workspaceRoot === workspaceRoot) return activeEngine;
  if (activeEngine) throw new Error('The previous Core workspace engine is still active.');
  const engine = core.createCodeGraphyWorkspaceEngine({ workspaceRoot });
  const record = { engine, workspaceRoot, ready: engine.index() };
  activeEngine = record;
  return record;
}

function warmWorkspaceEngine(workspaceRoot) {
  const record = startWorkspaceEngine(workspaceRoot);
  void record.ready.catch(error => write({
    kind: 'event',
    event: 'error',
    message: error instanceof Error ? error.message : String(error),
    workspaceRoot,
  }));
}

function graphRequest(request) {
  return {
    workspacePath: request.workspaceRoot,
    projection: { nodeTypes: ['file', 'folder'] },
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
    if (cached.kind === 'ready') {
      if (activeEngine?.workspaceRoot !== request.workspaceRoot) {
        await disposeActiveEngine();
        warmWorkspaceEngine(request.workspaceRoot);
      }
      return cached;
    }
    if (cached.kind === 'unreadable') return cached;
  }

  if (request.method === 'update') {
    if (activeEngine?.workspaceRoot !== request.workspaceRoot) await disposeActiveEngine();
    const record = startWorkspaceEngine(request.workspaceRoot);
    await record.ready;
    write({
      kind: 'event',
      event: 'indexing',
      workspaceRoot: request.workspaceRoot,
      filePaths: [request.relativePath],
    });
    const result = await record.engine.applyChangedFiles([request.relativePath]);
    return indexResult(result, core.requestCodeGraphyWorkspaceGraph(graphRequest(request)));
  }

  await disposeActiveEngine();
  write({
    kind: 'event',
    event: 'indexing',
    workspaceRoot: request.workspaceRoot,
  });
  const result = await core.indexCodeGraphyWorkspace({
    workspaceRoot: request.workspaceRoot,
  });
  const response = indexResult(result, core.requestCodeGraphyWorkspaceGraph(graphRequest(request)));
  warmWorkspaceEngine(request.workspaceRoot);
  return response;
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
await disposeActiveEngine();
