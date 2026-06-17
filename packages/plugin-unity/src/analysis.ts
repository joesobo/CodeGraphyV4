import path from 'node:path';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
} from '@codegraphy-dev/plugin-api';

const UNITY_PLUGIN_ID = 'codegraphy.unity';
const UNITY_LANGUAGE = 'unity';
const YAML_SOURCE_ID = 'unity-yaml';
const CONTAINMENT_SOURCE_ID = 'unity-containment';
const SCRIPT_GUID_SOURCE_ID = 'script-guid';
const PREFAB_GUID_SOURCE_ID = 'prefab-guid';
const SERIALIZED_GUID_SOURCE_ID = 'serialized-guid';

const SERIALIZED_FILE_EXTENSIONS = new Set(['.unity', '.prefab', '.asset', '.mat']);

interface AnalyzeUnitySerializedFileOptions {
  workspaceRoot?: string;
  resolveGuid?: (guid: string) => string | undefined;
}

interface UnityDocument {
  classId: string;
  fileId: string;
  className: string;
  startLine: number;
  endLine: number;
  name?: string;
  gameObjectFileId?: string;
  scriptGuid?: string;
  sourcePrefabGuid?: string;
  serializedGuidReferences: UnityGuidReference[];
}

interface UnityDocumentParseState {
  current: UnityDocument | null;
  documents: UnityDocument[];
}

interface UnityGuidReference {
  fieldName: string;
  guid: string;
}

interface UnitySymbolRecord {
  symbol: IAnalysisSymbol;
  document?: UnityDocument;
}

export function analyzeUnitySerializedFile(
  filePath: string,
  content: string,
  options: AnalyzeUnitySerializedFileOptions = {},
): IFileAnalysisResult {
  if (!isUnitySerializedFile(filePath)) {
    return { filePath, relations: [] };
  }

  const relativeFilePath = toWorkspaceRelativePath(filePath, options.workspaceRoot);
  const containerSymbol = createContainerSymbol(filePath, relativeFilePath);
  const documents = parseUnityDocuments(content);
  const gameObjects = documents
    .filter((document) => document.className === 'GameObject')
    .map((document) => createGameObjectSymbol(filePath, relativeFilePath, document));
  const componentSymbols = documents
    .filter(isComponentDocument)
    .map((document) => createComponentSymbol(filePath, relativeFilePath, document, options));

  const symbols = [
    ...(containerSymbol ? [containerSymbol.symbol] : []),
    ...gameObjects.map(({ symbol }) => symbol),
    ...componentSymbols.map(({ symbol }) => symbol),
  ];

  return {
    filePath,
    relations: createUnityRelations(
      filePath,
      documents,
      containerSymbol,
      gameObjects,
      componentSymbols,
      options,
    ),
    ...(symbols.length > 0 ? { symbols } : {}),
  };
}

function isUnitySerializedFile(filePath: string): boolean {
  return SERIALIZED_FILE_EXTENSIONS.has(path.extname(filePath));
}

function parseUnityDocuments(content: string): UnityDocument[] {
  const state: UnityDocumentParseState = {
    current: null,
    documents: [],
  };
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => parseUnityDocumentLine(state, line, index));
  pushCurrentUnityDocument(state);

  return state.documents.filter((document) => document.className);
}

function parseUnityDocumentLine(
  state: UnityDocumentParseState,
  line: string,
  index: number,
): void {
  const header = /^--- !u!(\d+)(?: &(-?\d+))?/.exec(line);
  if (header) {
    pushCurrentUnityDocument(state, index);
    state.current = createUnityDocument(header, index);
    return;
  }

  if (!state.current) {
    return;
  }

  updateUnityDocumentFromLine(state.current, line, index);
}

function createUnityDocument(header: RegExpExecArray, index: number): UnityDocument {
  return {
    classId: header[1],
    fileId: header[2] ?? '',
    className: '',
    startLine: index + 1,
    endLine: index + 1,
    serializedGuidReferences: [],
  };
}

function pushCurrentUnityDocument(
  state: UnityDocumentParseState,
  endLine?: number,
): void {
  if (!state.current) {
    return;
  }

  state.current.endLine = endLine ?? state.current.endLine;
  state.documents.push(state.current);
}

function updateUnityDocumentFromLine(
  document: UnityDocument,
  line: string,
  index: number,
): void {
  document.endLine = index + 1;
  document.className ||= readClassName(line);
  document.name ??= readField(line, 'm_Name') ?? undefined;
  document.gameObjectFileId ??= readFileIdField(line, 'm_GameObject') ?? undefined;
  document.scriptGuid ??= readGuidField(line, 'm_Script') ?? undefined;
  document.sourcePrefabGuid ??= readGuidField(line, 'm_SourcePrefab') ?? undefined;

  const serializedGuidReference = readSerializedGuidReference(line);
  if (serializedGuidReference) {
    document.serializedGuidReferences.push(serializedGuidReference);
  }
}

function readClassName(line: string): string {
  return /^([A-Za-z_][A-Za-z0-9_]*):\s*$/.exec(line.trim())?.[1] ?? '';
}

function readField(line: string, fieldName: string): string | null {
  const match = new RegExp(`^\\s*${escapeRegExp(fieldName)}:\\s*(.*)$`).exec(line);
  if (!match) {
    return null;
  }
  return cleanUnityScalar(match[1]);
}

function readFileIdField(line: string, fieldName: string): string | null {
  const value = readField(line, fieldName);
  return /\{fileID:\s*(-?\d+)/.exec(value ?? '')?.[1] ?? null;
}

function readGuidField(line: string, fieldName: string): string | null {
  const value = readField(line, fieldName);
  return /guid:\s*([0-9a-fA-F]+)/.exec(value ?? '')?.[1] ?? null;
}

function readSerializedGuidReference(line: string): UnityGuidReference | null {
  const match = /^\s*(?:-\s*)?([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(line);
  if (!match || match[1] === 'm_Script' || match[1] === 'm_SourcePrefab') {
    return null;
  }

  const guid = /guid:\s*([0-9a-fA-F]+)/.exec(match[2])?.[1];
  return guid ? { fieldName: match[1], guid } : null;
}

function cleanUnityScalar(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function createContainerSymbol(
  filePath: string,
  relativeFilePath: string,
): UnitySymbolRecord | null {
  const kind = getContainerKind(filePath);
  if (!kind) {
    return null;
  }

  const name = basenameWithoutExtension(relativeFilePath);
  return {
    symbol: {
      id: `${relativeFilePath}#unity:${kind}`,
      name,
      kind,
      filePath,
      signature: kind === 'scene' ? 'Unity Scene' : 'Unity Prefab',
      range: { startLine: 1, startColumn: 1, endLine: 1 },
      metadata: {
        language: UNITY_LANGUAGE,
        source: UNITY_PLUGIN_ID,
        pluginKind: kind,
      },
    },
  };
}

function createGameObjectSymbol(
  filePath: string,
  relativeFilePath: string,
  document: UnityDocument,
): UnitySymbolRecord {
  const name = document.name || `GameObject ${document.fileId}`;
  return {
    document,
    symbol: {
      id: `${relativeFilePath}#unity:game-object:${document.fileId}`,
      name,
      kind: 'game-object',
      filePath,
      signature: `GameObject ${document.fileId}`,
      range: createRange(document),
      metadata: {
        language: UNITY_LANGUAGE,
        source: UNITY_PLUGIN_ID,
        pluginKind: 'game-object',
        unityClass: document.className,
        fileId: document.fileId,
      },
    },
  };
}

function createComponentSymbol(
  filePath: string,
  relativeFilePath: string,
  document: UnityDocument,
  options: AnalyzeUnitySerializedFileOptions,
): UnitySymbolRecord {
  const scriptPath = document.scriptGuid ? options.resolveGuid?.(document.scriptGuid) : undefined;
  const name = getComponentName(document, scriptPath);

  return {
    document,
    symbol: {
      id: `${relativeFilePath}#unity:component:${document.fileId}`,
      name,
      kind: 'component',
      filePath,
      signature: document.className,
      range: createRange(document),
      metadata: {
        language: UNITY_LANGUAGE,
        source: UNITY_PLUGIN_ID,
        pluginKind: 'component',
        unityClass: document.className,
        fileId: document.fileId,
        ...(document.gameObjectFileId ? { gameObjectFileId: document.gameObjectFileId } : {}),
        ...(document.scriptGuid ? { scriptGuid: document.scriptGuid } : {}),
        ...(scriptPath ? { scriptPath } : {}),
      },
    },
  };
}

function createUnityRelations(
  filePath: string,
  documents: readonly UnityDocument[],
  containerSymbol: UnitySymbolRecord | null,
  gameObjects: readonly UnitySymbolRecord[],
  componentSymbols: readonly UnitySymbolRecord[],
  options: AnalyzeUnitySerializedFileOptions,
): IAnalysisRelation[] {
  const gameObjectByFileId = new Map(
    gameObjects
      .filter((record) => record.document?.fileId)
      .map((record) => [record.document!.fileId, record]),
  );
  const componentFileIds = new Set(
    componentSymbols
      .map((record) => record.document?.fileId)
      .filter((fileId): fileId is string => Boolean(fileId)),
  );

  return [
    ...createContainerRelations(filePath, containerSymbol, gameObjects),
    ...createComponentRelations(filePath, componentSymbols, gameObjectByFileId, options),
    ...createDocumentReferenceRelations(filePath, documents, componentFileIds, options),
  ];
}

function createContainerRelations(
  filePath: string,
  containerSymbol: UnitySymbolRecord | null,
  gameObjects: readonly UnitySymbolRecord[],
): IAnalysisRelation[] {
  if (!containerSymbol) {
    return [];
  }

  return gameObjects.map((gameObject) => (
    createContainsRelation(filePath, containerSymbol.symbol.id, gameObject.symbol.id)
  ));
}

function createComponentRelations(
  filePath: string,
  componentSymbols: readonly UnitySymbolRecord[],
  gameObjectByFileId: ReadonlyMap<string, UnitySymbolRecord>,
  options: AnalyzeUnitySerializedFileOptions,
): IAnalysisRelation[] {
  return componentSymbols.flatMap((component) => [
    ...createComponentContainmentRelations(filePath, component, gameObjectByFileId),
    ...createComponentScriptRelations(filePath, component, options),
  ]);
}

function createComponentContainmentRelations(
  filePath: string,
  component: UnitySymbolRecord,
  gameObjectByFileId: ReadonlyMap<string, UnitySymbolRecord>,
): IAnalysisRelation[] {
  const gameObjectFileId = component.document?.gameObjectFileId;
  const gameObject = gameObjectFileId ? gameObjectByFileId.get(gameObjectFileId) : undefined;
  return gameObject
    ? [createContainsRelation(filePath, gameObject.symbol.id, component.symbol.id)]
    : [];
}

function createComponentScriptRelations(
  filePath: string,
  component: UnitySymbolRecord,
  options: AnalyzeUnitySerializedFileOptions,
): IAnalysisRelation[] {
  const scriptPath = readStringMetadata(component.symbol.metadata?.scriptPath);
  if (!scriptPath) {
    return [];
  }

  return [
    createScriptReferenceRelation(filePath, component, scriptPath, options.workspaceRoot),
    createUnityReferenceRelation(
      filePath,
      SCRIPT_GUID_SOURCE_ID,
      scriptPath,
      options.workspaceRoot,
      { scriptGuid: readStringMetadata(component.symbol.metadata?.scriptGuid) ?? undefined },
    ),
  ];
}

function createScriptReferenceRelation(
  filePath: string,
  component: UnitySymbolRecord,
  scriptPath: string,
  workspaceRoot: string | undefined,
): IAnalysisRelation {
  const resolvedPath = resolveWorkspacePath(scriptPath, workspaceRoot);
  return {
    kind: 'reference',
    sourceId: SCRIPT_GUID_SOURCE_ID,
    fromFilePath: filePath,
    fromSymbolId: component.symbol.id,
    toFilePath: resolvedPath,
    specifier: scriptPath,
    resolvedPath,
    metadata: {
      language: UNITY_LANGUAGE,
      source: UNITY_PLUGIN_ID,
    },
  };
}

function createDocumentReferenceRelations(
  filePath: string,
  documents: readonly UnityDocument[],
  componentFileIds: ReadonlySet<string>,
  options: AnalyzeUnitySerializedFileOptions,
): IAnalysisRelation[] {
  return documents.flatMap((document) => [
    ...createDocumentScriptReferenceRelations(filePath, document, componentFileIds, options),
    ...createDocumentPrefabReferenceRelations(filePath, document, options),
    ...createSerializedGuidReferenceRelations(
      filePath,
      document.serializedGuidReferences,
      options,
    ),
  ]);
}

function createDocumentScriptReferenceRelations(
  filePath: string,
  document: UnityDocument,
  componentFileIds: ReadonlySet<string>,
  options: AnalyzeUnitySerializedFileOptions,
): IAnalysisRelation[] {
  if (!document.scriptGuid || componentFileIds.has(document.fileId)) {
    return [];
  }

  const scriptPath = options.resolveGuid?.(document.scriptGuid);
  return scriptPath
    ? [
      createUnityReferenceRelation(
        filePath,
        SCRIPT_GUID_SOURCE_ID,
        scriptPath,
        options.workspaceRoot,
        { scriptGuid: document.scriptGuid },
      ),
    ]
    : [];
}

function createDocumentPrefabReferenceRelations(
  filePath: string,
  document: UnityDocument,
  options: AnalyzeUnitySerializedFileOptions,
): IAnalysisRelation[] {
  if (!document.sourcePrefabGuid) {
    return [];
  }

  const prefabPath = options.resolveGuid?.(document.sourcePrefabGuid);
  return prefabPath
    ? [
      createUnityReferenceRelation(
        filePath,
        PREFAB_GUID_SOURCE_ID,
        prefabPath,
        options.workspaceRoot,
        { prefabGuid: document.sourcePrefabGuid },
      ),
    ]
    : [];
}

function createSerializedGuidReferenceRelations(
  filePath: string,
  references: readonly UnityGuidReference[],
  options: AnalyzeUnitySerializedFileOptions,
): IAnalysisRelation[] {
  return references.flatMap((reference) => {
    const assetPath = options.resolveGuid?.(reference.guid);
    if (!assetPath) {
      return [];
    }

    return [
      createUnityReferenceRelation(
        filePath,
        SERIALIZED_GUID_SOURCE_ID,
        assetPath,
        options.workspaceRoot,
        { fieldName: reference.fieldName, guid: reference.guid },
      ),
    ];
  });
}

function createUnityReferenceRelation(
  fromFilePath: string,
  sourceId: string,
  targetPath: string,
  workspaceRoot: string | undefined,
  metadata: Record<string, string | undefined>,
): IAnalysisRelation {
  const resolvedPath = resolveWorkspacePath(targetPath, workspaceRoot);
  return {
    kind: 'reference',
    sourceId,
    fromFilePath,
    toFilePath: resolvedPath,
    specifier: targetPath,
    resolvedPath,
    metadata: {
      language: UNITY_LANGUAGE,
      source: UNITY_PLUGIN_ID,
      ...pruneStringMetadata(metadata),
    },
  };
}

function pruneStringMetadata(metadata: Record<string, string | undefined>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value) {
      result[key] = value;
    }
  }
  return result;
}

function createContainsRelation(
  filePath: string,
  fromSymbolId: string,
  toSymbolId: string,
): IAnalysisRelation {
  return {
    kind: 'contains',
    sourceId: CONTAINMENT_SOURCE_ID,
    fromFilePath: filePath,
    toFilePath: filePath,
    fromSymbolId,
    toSymbolId,
    metadata: {
      language: UNITY_LANGUAGE,
      source: UNITY_PLUGIN_ID,
    },
  };
}

function getContainerKind(filePath: string): 'scene' | 'prefab' | null {
  const extension = path.extname(filePath);
  if (extension === '.unity') {
    return 'scene';
  }
  if (extension === '.prefab') {
    return 'prefab';
  }
  return null;
}

function isComponentDocument(document: UnityDocument): boolean {
  return Boolean(
    document.className &&
    document.className !== 'GameObject' &&
    document.gameObjectFileId &&
    document.gameObjectFileId !== '0',
  );
}

function getComponentName(document: UnityDocument, scriptPath: string | undefined): string {
  if (document.className === 'MonoBehaviour' && scriptPath) {
    return basenameWithoutExtension(scriptPath);
  }
  return document.name || document.className;
}

function createRange(document: UnityDocument): IAnalysisSymbol['range'] {
  return {
    startLine: document.startLine,
    startColumn: 1,
    endLine: document.endLine,
  };
}

function toWorkspaceRelativePath(filePath: string, workspaceRoot: string | undefined): string {
  if (workspaceRoot && path.isAbsolute(filePath)) {
    return normalizePath(path.relative(workspaceRoot, filePath));
  }
  return normalizePath(filePath).replace(/^\.\//, '');
}

function resolveWorkspacePath(filePath: string, workspaceRoot: string | undefined): string {
  if (path.isAbsolute(filePath) || !workspaceRoot) {
    return normalizePath(filePath);
  }
  return normalizePath(path.join(workspaceRoot, filePath));
}

function basenameWithoutExtension(filePath: string): string {
  const basename = path.basename(filePath);
  const extension = path.extname(basename);
  return extension ? basename.slice(0, -extension.length) : basename;
}

function readStringMetadata(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const unitySerializedFileExtensions = SERIALIZED_FILE_EXTENSIONS;
export const unityPluginId = UNITY_PLUGIN_ID;
export const unityYamlSourceId = YAML_SOURCE_ID;
