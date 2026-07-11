import { parentPort } from 'node:worker_threads';
import { analyzeFileWithTreeSitter } from '../analyze';
import {
  onPerfMetric,
  startPerfMetricSession,
  type ActivePerfMetric,
} from '../../../diagnostics/perfMetrics';
import type {
  ColdTreeSitterWorkerRequest,
  ColdTreeSitterWorkerResponse,
} from './pool';

export async function handleColdTreeSitterWorkerRequest(
  request: ColdTreeSitterWorkerRequest,
): Promise<ColdTreeSitterWorkerResponse> {
  const metrics: ActivePerfMetric[] = [];
  const subscription = onPerfMetric(event => metrics.push({
    metric: event.context.metric,
    value: event.context.value,
    unit: event.context.unit,
    ...(event.context.dimension ? { dimension: event.context.dimension } : {}),
    ...(event.context.filePath ? { filePath: event.context.filePath } : {}),
  }));
  const session = startPerfMetricSession({
    runId: `tree-sitter-worker-${request.id}`,
    scenario: 'cold-open',
  });
  try {
    const result = await analyzeFileWithTreeSitter(
      request.file.absolutePath,
      request.file.content,
      request.workspaceRoot,
    );
    return {
      id: request.id,
      ...(metrics.length > 0 ? { metrics } : {}),
      result: result ?? { filePath: request.file.absolutePath, relations: [] },
    };
  } catch (error) {
    return { error: String(error), id: request.id };
  } finally {
    session.dispose();
    subscription.dispose();
  }
}

if (parentPort) {
  const workerPort = parentPort;
  workerPort.on('message', (request: ColdTreeSitterWorkerRequest) => {
    void handleColdTreeSitterWorkerRequest(request).then((response) => {
      workerPort.postMessage(response);
    });
  });
}
