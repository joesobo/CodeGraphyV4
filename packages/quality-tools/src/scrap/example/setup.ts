import * as ts from 'typescript';
import { collectCallCount, isAssertionCall } from './calls/extract';
import { type ScrapExampleNode } from '../types';
import { statementFingerprint } from '../calls/normalizedShapes';

export interface ExampleSetupMetric {
  setupFingerprint?: string;
  setupLineCount: number;
}

function statementLineCount(sourceFile: ts.SourceFile, statement: ts.Statement): number {
  const start = sourceFile.getLineAndCharacterOfPosition(statement.getStart(sourceFile));
  const end = sourceFile.getLineAndCharacterOfPosition(statement.getEnd());
  return end.line - start.line + 1;
}

function bodyStatements(example: ScrapExampleNode): ts.Statement[] {
  const body = example.body.body;

  if (!body || !ts.isBlock(body)) {
    return [];
  }

  return [...body.statements];
}

export function setupStatements(example: ScrapExampleNode): ts.Statement[] {
  const statements: ts.Statement[] = [];

  for (const statement of bodyStatements(example)) {
    if (collectCallCount(statement, isAssertionCall) > 0) {
      break;
    }

    statements.push(statement);
  }

  return statements;
}

export function assertionStatements(example: ScrapExampleNode): ts.Statement[] {
  const statements = bodyStatements(example);
  const firstAssertionIndex = statements.findIndex((statement) => collectCallCount(statement, isAssertionCall) > 0);

  if (firstAssertionIndex === -1) {
    return [];
  }

  return statements.slice(firstAssertionIndex);
}

export function allExampleStatements(example: ScrapExampleNode): ts.Statement[] {
  return bodyStatements(example);
}

export function analyzeExampleSetup(
  sourceFile: ts.SourceFile,
  example: ScrapExampleNode
): ExampleSetupMetric {
  const statements = setupStatements(example);

  return {
    setupFingerprint: statementFingerprint(statements),
    setupLineCount: statements.reduce(
      (total, statement) => total + statementLineCount(sourceFile, statement),
      0
    )
  };
}
