interface NameParts {
  extension: string;
  stem: string;
}

function splitName(name: string): NameParts {
  const extensionIndex = name.lastIndexOf('.');
  if (extensionIndex <= 0) {
    return { extension: '', stem: name };
  }

  return {
    extension: name.slice(extensionIndex),
    stem: name.slice(0, extensionIndex),
  };
}

export function resolveCollisionName(
  name: string,
  siblings: readonly string[],
): string {
  const siblingNames = new Set(siblings);
  if (!siblingNames.has(name)) return name;

  const { extension, stem } = splitName(name);
  let copyNumber = 1;
  while (true) {
    const suffix = copyNumber === 1 ? ' copy' : ` copy ${copyNumber}`;
    const candidate = `${stem}${suffix}${extension}`;
    if (!siblingNames.has(candidate)) return candidate;
    copyNumber += 1;
  }
}

export function existingNameError(name: string): Error {
  return new Error(`A file or folder ${name} already exists at this location.`);
}
