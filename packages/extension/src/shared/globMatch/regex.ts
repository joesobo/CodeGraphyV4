/**
 * Convert a simple glob pattern to a RegExp.
 *
 * Rules:
 *  - `**` matches any path segments, including nested `/`
 *  - `*` matches anything except `/`
 *  - `[abc]` and `[!abc]` match one character from the (negated) set
 *  - remaining regex metacharacters are escaped
 *
 * Patterns are matched against the basename or path suffix, so `src/*`
 * works anywhere in the tree while still keeping `*` and `**` semantics.
 */
export function globToRegex(pattern: string): RegExp {
  let body = '';
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    const nextCharacter = pattern[index + 1];
    const afterNextCharacter = pattern[index + 2];

    if (character === '*' && nextCharacter === '*' && afterNextCharacter === '/') {
      body += '(?:.*/)?';
      index += 2;
      continue;
    }

    if (character === '*' && nextCharacter === '*') {
      body += '.*';
      index += 1;
      continue;
    }

    if (character === '*') {
      body += '[^/]*';
      continue;
    }

    if (character === '[') {
      const characterClass = readCharacterClass(pattern, index);
      if (characterClass) {
        body += characterClass.body;
        index += characterClass.length - 1;
        continue;
      }
    }

    body += character.replace(/([.+^${}()|[\]\\])/g, '\\$1');
  }

  return new RegExp(`(?:^|/)${body}$`);
}

function readCharacterClass(
  pattern: string,
  start: number,
): { body: string; length: number } | null {
  const negated = pattern[start + 1] === '!';
  const contentStart = start + (negated ? 2 : 1);
  const end = pattern.indexOf(']', contentStart + 1);
  if (end === -1) {
    return null;
  }

  const content = pattern
    .slice(contentStart, end)
    .replace(/\\/g, '\\\\')
    .replace(/\^/g, '\\^');
  return {
    body: `[${negated ? '^' : ''}${content}]`,
    length: end - start + 1,
  };
}
