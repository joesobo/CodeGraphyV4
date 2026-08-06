export interface MaterialIconManifest {
  fileExtensions?: Record<string, string>;
  fileNames?: Record<string, string>;
  folder?: string;
  folderNames?: Record<string, string>;
  folderNamesExpanded?: Record<string, string>;
  iconDefinitions?: Record<string, { iconPath: string }>;
  languageIds?: Record<string, string>;
  rootFolder?: string;
}

export interface MaterialMatch {
  iconName: string;
  key: string;
  kind: 'fileExtension' | 'fileName' | 'folderName';
}

export interface MaterialExtensionMatcher {
  iconNameByLowerExtension: Map<string, string>;
}

export interface MaterialPathRuleEntry {
  iconName: string;
  lowerRule: string;
  normalizedRule: string;
}

export interface MaterialPathRuleMatcher {
  baseNameRules: Map<string, MaterialPathRuleEntry>;
  pathRules: MaterialPathRuleEntry[];
  pathRulesByLowerBaseName: Map<string, MaterialPathRuleEntry[]>;
}

export interface MaterialThemePathMatchers {
  fileNames?: MaterialPathRuleMatcher;
  folderNames?: MaterialPathRuleMatcher;
  folderNamesExpanded?: MaterialPathRuleMatcher;
}

export const DEFAULT_MATERIAL_COLOR = '#90A4AE';

const COLOR_PATTERN = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})/g;

const LANGUAGE_FALLBACKS: ReadonlyArray<{
  extensions: readonly string[];
  languageId: string;
}> = [
  { languageId: 'javascript', extensions: ['js', 'cjs', 'mjs', 'esx'] },
  { languageId: 'typescript', extensions: ['ts', 'cts', 'mts', 'ets'] },
  { languageId: 'javascriptreact', extensions: ['jsx'] },
  { languageId: 'typescriptreact', extensions: ['tsx'] },
  { languageId: 'markdown', extensions: ['markdown', 'md', 'rst'] },
  { languageId: 'python', extensions: ['py', 'pyi'] },
  { languageId: 'java', extensions: ['java'] },
  { languageId: 'csharp', extensions: ['cs'] },
  { languageId: 'rust', extensions: ['rs'] },
  { languageId: 'go', extensions: ['go'] },
  { languageId: 'vue', extensions: ['vue'] },
  { languageId: 'html', extensions: ['html', 'htm', 'xhtml'] },
  { languageId: 'css', extensions: ['css'] },
  { languageId: 'sass', extensions: ['scss', 'sass'] },
  { languageId: 'less', extensions: ['less'] },
  { languageId: 'yaml', extensions: ['yaml', 'yml'] },
  { languageId: 'xml', extensions: ['xml', 'plist', 'xsd', 'dtd', 'xsl', 'xslt', 'resx'] },
  { languageId: 'toml', extensions: ['toml'] },
  { languageId: 'json', extensions: ['json', 'jsonc', 'json5', 'jsonl'] },
  { languageId: 'sql', extensions: ['sql'] },
  { languageId: 'php', extensions: ['php'] },
  { languageId: 'ruby', extensions: ['rb'] },
  { languageId: 'lua', extensions: ['lua'] },
  { languageId: 'swift', extensions: ['swift'] },
  { languageId: 'dart', extensions: ['dart'] },
  { languageId: 'svelte', extensions: ['svelte'] },
  { languageId: 'c', extensions: ['c', 'h'] },
  { languageId: 'cpp', extensions: ['cc', 'cpp', 'cxx', 'hh', 'hpp', 'hxx'] },
];

export function createMaterialExtensionMatcher(
  extensions: Record<string, string>,
): MaterialExtensionMatcher {
  return {
    iconNameByLowerExtension: new Map(
      Object.entries(extensions).map(([extension, iconName]) => [extension.toLowerCase(), iconName]),
    ),
  };
}

export function findLongestExtensionMatch(
  baseName: string,
  entries: Iterable<readonly [string, string]>,
): MaterialMatch | undefined {
  return findLongestExtensionMatchWithMatcher(
    baseName,
    createMaterialExtensionMatcher(Object.fromEntries(entries)),
  );
}

export function findLongestExtensionMatchWithMatcher(
  baseName: string,
  matcher: MaterialExtensionMatcher,
): MaterialMatch | undefined {
  const lowerBaseName = baseName.toLowerCase();
  let bestMatch: MaterialMatch | undefined;
  for (const extension of getExtensionCandidates(lowerBaseName)) {
    const iconName = matcher.iconNameByLowerExtension.get(extension);
    if (!iconName) continue;
    const match = createExtensionMatch(baseName, lowerBaseName, extension, iconName);
    if (match && (!bestMatch || bestMatch.key.length < match.key.length)) bestMatch = match;
  }
  return bestMatch;
}

export function matchMaterialFileExtension(
  baseName: string,
  fileExtensions: Record<string, string>,
  matcher: MaterialExtensionMatcher = createMaterialExtensionMatcher(fileExtensions),
): MaterialMatch | undefined {
  return findLongestExtensionMatchWithMatcher(baseName, matcher);
}

export function createMaterialPathRuleMatcher(
  rules: Record<string, string>,
): MaterialPathRuleMatcher {
  const baseNameRules = new Map<string, MaterialPathRuleEntry>();
  const pathRules: MaterialPathRuleEntry[] = [];
  const pathRulesByLowerBaseName = new Map<string, MaterialPathRuleEntry[]>();
  for (const [ruleKey, iconName] of Object.entries(rules)) {
    const normalizedRule = normalizePathSeparators(ruleKey);
    const lowerRule = normalizedRule.toLowerCase();
    const entry = { iconName, lowerRule, normalizedRule };
    if (!normalizedRule.includes('/')) {
      baseNameRules.set(lowerRule, entry);
      continue;
    }
    pathRules.push(entry);
    const lowerBaseName = getMaterialBaseName(normalizedRule).toLowerCase();
    const rulesForBaseName = pathRulesByLowerBaseName.get(lowerBaseName) ?? [];
    rulesForBaseName.push(entry);
    pathRulesByLowerBaseName.set(lowerBaseName, rulesForBaseName);
  }
  pathRules.sort(longestRuleFirst);
  for (const rulesForBaseName of pathRulesByLowerBaseName.values()) {
    rulesForBaseName.sort(longestRuleFirst);
  }
  return { baseNameRules, pathRules, pathRulesByLowerBaseName };
}

export function findLongestPathMatch(
  subjectPath: string,
  rules: Record<string, string>,
  kind: 'fileName' | 'folderName',
): MaterialMatch | undefined {
  return findLongestPathMatchWithMatcher(subjectPath, createMaterialPathRuleMatcher(rules), kind);
}

export function findLongestPathMatchWithMatcher(
  subjectPath: string,
  matcher: MaterialPathRuleMatcher,
  kind: 'fileName' | 'folderName',
): MaterialMatch | undefined {
  const subject = normalizePathSeparators(subjectPath);
  const baseName = getMaterialBaseName(subject);
  const lowerSubject = subject.toLowerCase();
  const lowerBaseName = baseName.toLowerCase();
  for (const rule of matcher.pathRulesByLowerBaseName.get(lowerBaseName) ?? []) {
    if (lowerSubject !== rule.lowerRule && !lowerSubject.endsWith(`/${rule.lowerRule}`)) continue;
    return {
      iconName: rule.iconName,
      key: lowerSubject === rule.lowerRule ? subject : subject.slice(-rule.normalizedRule.length),
      kind,
    };
  }
  const rule = matcher.baseNameRules.get(lowerBaseName);
  return rule ? { iconName: rule.iconName, key: baseName, kind } : undefined;
}

export function matchMaterialFileName(
  nodeId: string,
  fileNames: Record<string, string>,
  matcher: MaterialPathRuleMatcher = createMaterialPathRuleMatcher(fileNames),
): MaterialMatch | undefined {
  return findLongestPathMatchWithMatcher(nodeId, matcher, 'fileName');
}

export function matchMaterialFolderName(
  folderPath: string,
  folderNames: Record<string, string>,
  folderNamesExpanded: Record<string, string> = {},
  matchers: Pick<MaterialThemePathMatchers, 'folderNames' | 'folderNamesExpanded'> = {},
): MaterialMatch | undefined {
  return findLongestPathMatchWithMatcher(
    folderPath,
    matchers.folderNames ?? createMaterialPathRuleMatcher(folderNames),
    'folderName',
  ) ?? findLongestPathMatchWithMatcher(
    folderPath,
    matchers.folderNamesExpanded ?? createMaterialPathRuleMatcher(folderNamesExpanded),
    'folderName',
  );
}

export function matchMaterialLanguageFallback(
  baseName: string,
  languageIds: Record<string, string>,
): MaterialMatch | undefined {
  const entries: Array<readonly [string, string]> = [];
  for (const { extensions, languageId } of LANGUAGE_FALLBACKS) {
    const iconName = languageIds[languageId];
    if (!iconName) continue;
    for (const extension of extensions) entries.push([extension, iconName]);
  }
  return findLongestExtensionMatch(baseName, entries);
}

export function findMaterialMatch(
  nodeId: string,
  manifest: MaterialIconManifest,
  options?: {
    extensionMatcher?: MaterialExtensionMatcher;
    nodeType?: 'file' | 'folder';
    pathMatchers?: MaterialThemePathMatchers;
  },
): MaterialMatch | undefined {
  if (options?.nodeType === 'folder') {
    return manifest.folderNames
      ? matchMaterialFolderName(
        nodeId,
        manifest.folderNames,
        manifest.folderNamesExpanded,
        options.pathMatchers,
      )
      : undefined;
  }
  const baseName = getMaterialBaseName(nodeId);
  if (!baseName) return undefined;
  return (manifest.fileNames
    ? matchMaterialFileName(nodeId, manifest.fileNames, options?.pathMatchers?.fileNames)
    : undefined)
    ?? (manifest.fileExtensions
      ? matchMaterialFileExtension(baseName, manifest.fileExtensions, options?.extensionMatcher)
      : undefined)
    ?? (manifest.languageIds
      ? matchMaterialLanguageFallback(baseName, manifest.languageIds)
      : undefined);
}

export function normalizePathSeparators(value: string): string {
  return value.replace(/\\/g, '/');
}

export function getMaterialBaseName(value: string): string {
  const normalized = normalizePathSeparators(value);
  return normalized.slice(normalized.lastIndexOf('/') + 1);
}

export function extractPrimaryColor(svg: string): string {
  const counts = new Map<string, number>();
  let bestColor = DEFAULT_MATERIAL_COLOR;
  let bestCount = 0;
  for (const match of svg.match(COLOR_PATTERN) ?? []) {
    const normalized = normalizeHexColor(match);
    const count = (counts.get(normalized) ?? 0) + 1;
    counts.set(normalized, count);
    if (count > bestCount) {
      bestColor = normalized;
      bestCount = count;
    }
  }
  return bestColor;
}

export function toWhiteSvgDataUrl(svg: string): string {
  return toSvgDataUrl(toWhiteSvg(svg));
}

export function toWhiteSvg(svg: string): string {
  return svg.replace(COLOR_PATTERN, '#FFFFFF');
}

export function toSvgDataUrl(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

function getExtensionCandidates(lowerBaseName: string): string[] {
  const candidates = [lowerBaseName];
  for (
    let index = lowerBaseName.indexOf('.');
    index >= 0;
    index = lowerBaseName.indexOf('.', index + 1)
  ) {
    const extension = lowerBaseName.slice(index + 1);
    if (extension) candidates.push(extension);
  }
  return candidates;
}

function createExtensionMatch(
  baseName: string,
  lowerBaseName: string,
  extension: string,
  iconName: string,
): MaterialMatch | undefined {
  const lowerExtension = extension.toLowerCase();
  if (lowerBaseName !== lowerExtension && !lowerBaseName.endsWith(`.${lowerExtension}`)) {
    return undefined;
  }
  return {
    iconName,
    key: lowerBaseName === lowerExtension ? baseName : baseName.slice(-extension.length),
    kind: 'fileExtension',
  };
}

function longestRuleFirst(left: MaterialPathRuleEntry, right: MaterialPathRuleEntry): number {
  return right.normalizedRule.length - left.normalizedRule.length;
}

function normalizeHexColor(value: string): string {
  if (value.length === 4) {
    const red = value.charAt(1);
    const green = value.charAt(2);
    const blue = value.charAt(3);
    return `#${red}${red}${green}${green}${blue}${blue}`.toUpperCase();
  }
  return value.slice(0, 7).toUpperCase();
}
