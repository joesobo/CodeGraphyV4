export interface ParsedWikilink {
  target: string;
  alias?: string;
  specifier: string;
}

const FENCE_START_RE = /^(?:```|~~~)/;
const INLINE_CODE_RE = /`[^`]*`/g;

export function isFenceStart(line: string): boolean {
  return FENCE_START_RE.test(line.trimStart());
}

export function stripInlineCode(line: string): string {
  return line.replace(INLINE_CODE_RE, '');
}

export function parseWikilink(inner: string): ParsedWikilink | null {
  const full = inner;
  const pipeIndex = full.indexOf('|');
  const targetWithHeading =
    pipeIndex === -1 ? full : full.slice(0, pipeIndex);
  const target = targetWithHeading.split('#')[0].trim();

  if (!target) {
    return null;
  }

  const aliasText =
    pipeIndex === -1
      ? ''
      : full.slice(pipeIndex + 1).trim();
  const alias = aliasText || undefined;

  return {
    target,
    alias,
    specifier: alias
      ? `[[${target}|${alias}]]`
      : `[[${target}]]`,
  };
}
