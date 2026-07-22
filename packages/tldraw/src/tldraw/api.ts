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

export interface TldrawScriptWorkspace {
  scriptDir: string;
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
const desiredShapes = desired.filter(record => record.typeName === 'shape');
const desiredAssets = desired.filter(record => record.typeName === 'asset');
const desiredShapeIds = new Set(desiredShapes.map(shape => shape.id));
const desiredAssetIds = new Set(desiredAssets.map(asset => asset.id));
const current = editor.getCurrentPageShapes();
const currentIds = new Set(current.map(shape => shape.id));
const staleIds = current
  .filter(shape => (shape.meta?.codegraphyKind === 'node'
    || shape.meta?.codegraphyKind === 'edge'
    || shape.meta?.codegraphyKind === 'icon'
    || shape.meta?.codegraphyKind === 'label') && !desiredShapeIds.has(shape.id))
  .map(shape => shape.id);
const currentAssets = editor.getAssets();
const currentAssetIds = new Set(currentAssets.map(asset => asset.id));
const staleAssetIds = currentAssets
  .filter(asset => asset.meta?.codegraphyKind === 'iconAsset' && !desiredAssetIds.has(asset.id))
  .map(asset => asset.id);
const updates = desiredShapes.filter(shape => currentIds.has(shape.id));
const creates = desiredShapes.filter(shape => !currentIds.has(shape.id));
const assetUpdates = desiredAssets.filter(asset => currentAssetIds.has(asset.id));
const assetCreates = desiredAssets.filter(asset => !currentAssetIds.has(asset.id));
editor.run(() => {
  if (staleIds.length > 0) editor.deleteShapes(staleIds);
  if (staleAssetIds.length > 0) editor.deleteAssets(staleAssetIds);
  if (assetUpdates.length > 0) editor.updateAssets(assetUpdates);
  if (assetCreates.length > 0) editor.createAssets(assetCreates);
  if (updates.length > 0) editor.updateShapes(updates);
  if (creates.length > 0) editor.createShapes(creates);
}, { history: 'ignore', ignoreShapeLock: true });
return {
  created: creates.length + assetCreates.length,
  deleted: staleIds.length + staleAssetIds.length,
  updated: updates.length + assetUpdates.length,
};
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

  async reconcileRecords(documentId: string, records: readonly object[]): Promise<void> {
    await this.request(
      `/api/doc/${documentId}/exec`,
      reconciliationCode(records),
    );
  }

  async getScriptWorkspace(documentId: string): Promise<TldrawScriptWorkspace> {
    const response = await this.fetchImplementation(
      `http://127.0.0.1:${this.connection.port}/api/doc/${documentId}/script-workspace`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.connection.token}` },
      },
    );
    const payload = await response.json() as TldrawApiResponse<TldrawScriptWorkspace>;
    if (!response.ok || !payload.success) {
      throw new Error(payload.error ?? `tldraw offline API request failed (${response.status})`);
    }
    return payload.result as TldrawScriptWorkspace;
  }
}
