import * as ts from 'typescript';
import { baseCallName } from './callNames';

const EXCLUDED_SUBJECTS = new Set([
  'act',
  'afterAll',
  'afterEach',
  'beforeAll',
  'beforeEach',
  'describe',
  'expect',
  'expectTypeOf',
  'it',
  'jest',
  'screen',
  'test',
  'vi',
  'waitFor'
]);

export function collectSubjectNames(node: ts.Node): string[] {
  const subjects = new Set<string>();

  function walk(current: ts.Node): void {
    if (ts.isCallExpression(current)) {
      const subject = baseCallName(current.expression);
      if (subject && !EXCLUDED_SUBJECTS.has(subject)) {
        subjects.add(subject);
      }
    }

    ts.forEachChild(current, walk);
  }

  walk(node);
  return [...subjects].sort();
}
