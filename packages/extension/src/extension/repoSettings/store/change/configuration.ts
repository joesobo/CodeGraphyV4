export function affectsSettingsConfiguration(
  changedKeys: readonly string[],
  section: string,
): boolean {
  if (section === 'codegraphy') {
    return true;
  }

  if (!section.startsWith('codegraphy.')) {
    return false;
  }

  const key = section.slice('codegraphy.'.length);
  return changedKeys.some(
    changedKey =>
      changedKey === key
      || changedKey.startsWith(`${key}.`)
      || key.startsWith(`${changedKey}.`),
  );
}
