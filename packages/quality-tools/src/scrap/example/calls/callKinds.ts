export function isExampleCallName(callName: string | undefined): boolean {
  return callName === 'it' || callName === 'test';
}

export function nextInsideExampleState(
  insideExample: boolean,
  callName: string | undefined
): boolean {
  return insideExample || isExampleCallName(callName);
}
