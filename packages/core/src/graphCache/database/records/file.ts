import type {
  GraphMetadata,
  IAnalysisNode,
  IFileAnalysisResult,
  IPluginEdgeType,
  IPluginGraphTypeDescription,
  IPluginNodeType,
} from '@codegraphy-dev/plugin-api';
import type { FileRow, GraphTypeRow, NodeRow } from './contracts';
import { readOptionalNumber, readOptionalString, readRequiredString } from './values';
import { parseOptionalJson } from './values';

export function createSnapshotFileEntry(
  row: FileRow,
):
  | {
      filePath: string;
      mtime: number;
      size?: number;
      contentHash?: string;
      analysis: IFileAnalysisResult;
    }
  | undefined {
  const filePath = readRequiredString(row.filePath);
  const analysisText = readRequiredString(row.factsJson);

  if (!filePath || !analysisText) {
    return undefined;
  }

  const contentHash = readOptionalString(row.contentHash);
  return {
    filePath,
    mtime: Number(row.mtime ?? 0),
    size: readOptionalNumber(row.size),
    ...(contentHash ? { contentHash } : {}),
    analysis: JSON.parse(analysisText) as IFileAnalysisResult,
  };
}

export function createSnapshotNodeEntry(row: NodeRow): IAnalysisNode | undefined {
  const id = readRequiredString(row.nodeId);
  const nodeType = readRequiredString(row.nodeType);
  const label = readRequiredString(row.label);
  if (!id || !nodeType || !label) return undefined;
  const filePath = readOptionalString(row.sourceFilePath);
  const parentId = readOptionalString(row.parentId);
  const metadata = parseOptionalJson<GraphMetadata>(row.metadataJson);
  return {
    id,
    nodeType,
    label,
    ...(filePath ? { filePath } : {}),
    ...(parentId ? { parentId } : {}),
    ...(metadata ? { metadata } : {}),
  };
}

function createGraphTypeBase(row: GraphTypeRow) {
  const id = readRequiredString(row.typeId);
  const label = readRequiredString(row.label);
  const defaultColor = readRequiredString(row.defaultColor);
  if (!id || !label || !defaultColor || typeof row.defaultVisible !== 'number') return undefined;
  const description = parseOptionalJson<IPluginGraphTypeDescription>(row.descriptionJson);
  return {
    id,
    label,
    defaultColor,
    defaultVisible: row.defaultVisible !== 0,
    ...(description ? { description } : {}),
  };
}

export function createSnapshotNodeTypeEntry(row: GraphTypeRow): IPluginNodeType | undefined {
  const base = createGraphTypeBase(row);
  if (!base) return undefined;
  const parentId = readOptionalString(row.parentId);
  return { ...base, ...(parentId ? { parentId } : {}) };
}

export function createSnapshotEdgeTypeEntry(row: GraphTypeRow): IPluginEdgeType | undefined {
  const base = createGraphTypeBase(row);
  return base ? { ...base, id: base.id as IPluginEdgeType['id'] } : undefined;
}
