const TEMP_RESOURCE_CALLS = new Set([
  'mkdtemp',
  'mkdtempSync',
  'mkdir',
  'mkdirSync',
  'tmpdir',
  'writeFile',
  'writeFileSync'
]);

export function isTempResourceCallName(callName: string | undefined): boolean {
  return TEMP_RESOURCE_CALLS.has(callName as string);
}
