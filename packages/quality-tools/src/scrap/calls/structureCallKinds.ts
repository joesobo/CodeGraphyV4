function isHookCallName(callName: string): boolean {
  return callName === 'afterAll' ||
    callName === 'afterEach' ||
    callName === 'beforeAll' ||
    callName === 'beforeEach';
}

function isStructureCallName(callName: string): boolean {
  return callName === 'context' || callName === 'describe';
}

export function isHookOrStructureCallName(callName: string | undefined): boolean {
  return typeof callName === 'string' &&
    (isHookCallName(callName) || isStructureCallName(callName));
}
