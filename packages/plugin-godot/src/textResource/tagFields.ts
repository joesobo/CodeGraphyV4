const TAG_FIELD_REGEX = /\b([A-Za-z_][A-Za-z0-9_]*)=(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^\s\]]+))/g;

function tagFieldValue(fieldMatch: RegExpExecArray): string {
  return fieldMatch[2] ?? fieldMatch[3] ?? fieldMatch[4];
}

export function parseGodotTagFields(input: string): Record<string, string> {
  const fields: Record<string, string> = {};

  TAG_FIELD_REGEX.lastIndex = 0;
  let fieldMatch;
  while ((fieldMatch = TAG_FIELD_REGEX.exec(input)) !== null) {
    fields[fieldMatch[1]] = tagFieldValue(fieldMatch);
  }

  return fields;
}
