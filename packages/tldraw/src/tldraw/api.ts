import path from 'node:path';

export interface TldrawServerConnection {
  port: number;
  token: string;
}

export interface TldrawOpenDocument {
  id: string;
  filePath: string | null;
  name: string;
}

interface TldrawApiResponse<T> {
  success: boolean;
  result?: T;
  error?: string;
}

type FetchImplementation = typeof fetch;

function reconciliationCode(records: readonly object[]): string {
  const serializedRecords = JSON.stringify(records);
  return `
const desired = ${serializedRecords};
const desiredIds = new Set(desired.map(shape => shape.id));
const current = editor.getCurrentPageShapes();
const currentIds = new Set(current.map(shape => shape.id));
const staleIds = current
  .filter(shape => (shape.meta?.codegraphyKind === 'node' || shape.meta?.codegraphyKind === 'edge') && !desiredIds.has(shape.id))
  .map(shape => shape.id);
const updates = desired.filter(shape => currentIds.has(shape.id));
const creates = desired.filter(shape => !currentIds.has(shape.id));
editor.run(() => {
  if (staleIds.length > 0) editor.deleteShapes(staleIds);
  if (updates.length > 0) editor.updateShapes(updates);
  if (creates.length > 0) editor.createShapes(creates);
}, { history: 'ignore' });
return { created: creates.length, deleted: staleIds.length, updated: updates.length };
`;
}

export class TldrawApiClient {
  constructor(
    private readonly connection: TldrawServerConnection,
    private readonly fetchImplementation: FetchImplementation = fetch,
  ) {}

  private async request<T>(endpoint: string, code: string): Promise<T> {
    const response = await this.fetchImplementation(
      `http://127.0.0.1:${this.connection.port}${endpoint}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.connection.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      },
    );
    const payload = await response.json() as TldrawApiResponse<T>;
    if (!response.ok || !payload.success) {
      throw new Error(payload.error ?? `tldraw offline API request failed (${response.status})`);
    }
    return payload.result as T;
  }

  async findOpenDocument(documentPath: string): Promise<TldrawOpenDocument | undefined> {
    const documents = await this.request<TldrawOpenDocument[]>(
      '/api/search',
      'return await api.getDocs()',
    );
    const resolvedTarget = path.resolve(documentPath);
    return documents.find(document => (
      document.filePath !== null && path.resolve(document.filePath) === resolvedTarget
    ));
  }

  async readShapes(documentId: string): Promise<object[]> {
    const result = await this.request<{ shapes?: object[] }>(
      '/api/search',
      `return await api.getShapes(${JSON.stringify(documentId)})`,
    );
    return result.shapes ?? [];
  }

  async reconcileShapes(documentId: string, records: readonly object[]): Promise<void> {
    await this.request(
      `/api/doc/${encodeURIComponent(documentId)}/exec`,
      reconciliationCode(records),
    );
  }
}
