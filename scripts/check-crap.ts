#!/usr/bin/env tsx

/**
 * CRAP Score Calculator (Change Risk Anti-Patterns)
 *
 * CRAP(m) = comp(m)² × (1 - cov(m)/100)³ + comp(m)
 *
 * Combines cyclomatic complexity with code coverage to identify
 * functions that are both complex and poorly tested.
 *
 * Usage:
 *   tsx scripts/check-crap.ts [--threshold N] [--filter <glob>]
 *
 * Requires coverage JSON at coverage/coverage-final.json
 * (run: pnpm run test -- --coverage)
 */

import { readFileSync, existsSync } from 'fs';
import * as ts from 'typescript';
import * as path from 'path';

// --- Types ---

interface FunctionInfo {
	name: string;
	file: string;
	line: number;
	endLine: number;
	complexity: number;
}

interface IstanbulFnMapEntry {
	name: string;
	decl: { start: { line: number; column: number }; end: { line: number; column: number } };
	loc: { start: { line: number; column: number }; end: { line: number; column: number } };
}

interface IstanbulStatementMapEntry {
	start: { line: number; column: number };
	end: { line: number; column: number };
}

interface IstanbulFileCoverage {
	path: string;
	fnMap: Record<string, IstanbulFnMapEntry>;
	f: Record<string, number>;
	statementMap: Record<string, IstanbulStatementMapEntry>;
	s: Record<string, number>;
}

interface CrapResult {
	name: string;
	file: string;
	line: number;
	complexity: number;
	coverage: number;
	crap: number;
}

// --- Cyclomatic Complexity ---

function computeComplexity(node: ts.Node): number {
	let complexity = 0;

	function walk(n: ts.Node): void {
		switch (n.kind) {
			case ts.SyntaxKind.IfStatement:
			case ts.SyntaxKind.ForStatement:
			case ts.SyntaxKind.ForInStatement:
			case ts.SyntaxKind.ForOfStatement:
			case ts.SyntaxKind.WhileStatement:
			case ts.SyntaxKind.DoStatement:
			case ts.SyntaxKind.CaseClause:
			case ts.SyntaxKind.CatchClause:
			case ts.SyntaxKind.ConditionalExpression:
				complexity++;
				break;
			case ts.SyntaxKind.BinaryExpression: {
				const binExpr = n as ts.BinaryExpression;
				if (
					binExpr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
					binExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
					binExpr.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
				) {
					complexity++;
				}
				break;
			}
		}
		ts.forEachChild(n, walk);
	}

	ts.forEachChild(node, walk);
	return complexity + 1; // base complexity
}

function extractFunctions(sourceFile: ts.SourceFile): FunctionInfo[] {
	const functions: FunctionInfo[] = [];
	const filePath = sourceFile.fileName;

	function getFunctionName(node: ts.Node): string {
		if (ts.isFunctionDeclaration(node) && node.name) {
			return node.name.text;
		}
		if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
			return node.name.text;
		}
		if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
			const parent = node.parent;
			if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
				return parent.name.text;
			}
			if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) {
				return parent.name.text;
			}
			if (ts.isPropertyDeclaration(parent) && ts.isIdentifier(parent.name)) {
				return parent.name.text;
			}
		}
		if (ts.isGetAccessorDeclaration(node) && ts.isIdentifier(node.name)) {
			return `get ${node.name.text}`;
		}
		if (ts.isSetAccessorDeclaration(node) && ts.isIdentifier(node.name)) {
			return `set ${node.name.text}`;
		}
		if (ts.isConstructorDeclaration(node)) {
			return 'constructor';
		}
		return '(anonymous)';
	}

	function walk(node: ts.Node): void {
		if (
			ts.isFunctionDeclaration(node) ||
			ts.isFunctionExpression(node) ||
			ts.isArrowFunction(node) ||
			ts.isMethodDeclaration(node) ||
			ts.isGetAccessorDeclaration(node) ||
			ts.isSetAccessorDeclaration(node) ||
			ts.isConstructorDeclaration(node)
		) {
			const startPos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
			const endPos = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

			functions.push({
				name: getFunctionName(node),
				file: filePath,
				line: startPos.line + 1,
				endLine: endPos.line + 1,
				complexity: computeComplexity(node),
			});
		}
		ts.forEachChild(node, walk);
	}

	walk(sourceFile);
	return functions;
}

// --- Coverage ---

function getFunctionCoverage(
	fn: FunctionInfo,
	fileCoverage: IstanbulFileCoverage,
): number {
	const statementsInRange: { id: string; covered: boolean }[] = [];

	for (const [id, loc] of Object.entries(fileCoverage.statementMap)) {
		if (loc.start.line >= fn.line && loc.end.line <= fn.endLine) {
			statementsInRange.push({
				id,
				covered: fileCoverage.s[id] > 0,
			});
		}
	}

	if (statementsInRange.length === 0) {
		return 0;
	}

	const covered = statementsInRange.filter((s) => s.covered).length;
	return (covered / statementsInRange.length) * 100;
}

// --- CRAP ---

function calculateCrap(complexity: number, coverage: number): number {
	const uncovered = 1 - coverage / 100;
	return complexity ** 2 * uncovered ** 3 + complexity;
}

// --- Main ---

function main(): void {
	const args = process.argv.slice(2);

	const thresholdArg = args.find((arg) => arg.startsWith('--threshold'));
	const threshold = thresholdArg
		? parseInt(thresholdArg.split('=')[1] || args[args.indexOf(thresholdArg) + 1], 10)
		: 8;

	const filterArg = args.find((arg) => arg.startsWith('--filter'));
	const filter = filterArg
		? filterArg.split('=')[1] || args[args.indexOf(filterArg) + 1]
		: undefined;

	const coveragePath = path.resolve('coverage/coverage-final.json');

	if (!existsSync(coveragePath)) {
		console.error('Coverage data not found at coverage/coverage-final.json');
		console.error('Run: pnpm run test -- --coverage');
		process.exit(1);
	}

	const coverageData = JSON.parse(
		readFileSync(coveragePath, 'utf-8'),
	) as Record<string, IstanbulFileCoverage>;

	const results: CrapResult[] = [];

	for (const [filePath, fileCoverage] of Object.entries(coverageData)) {
		if (filter && !filePath.includes(filter)) {
			continue;
		}

		// Skip test and e2e files
		if (filePath.includes('/e2e/') || filePath.includes('/__tests__/') || filePath.includes('.test.')) {
			continue;
		}

		if (!existsSync(filePath)) {
			continue;
		}

		const source = readFileSync(filePath, 'utf-8');
		const sourceFile = ts.createSourceFile(
			filePath,
			source,
			ts.ScriptTarget.Latest,
			true,
			filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
		);

		const functions = extractFunctions(sourceFile);

		for (const fn of functions) {
			const coverage = getFunctionCoverage(fn, fileCoverage);
			const crap = calculateCrap(fn.complexity, coverage);

			if (crap > threshold) {
				const relativePath = path.relative(process.cwd(), fn.file);
				results.push({
					name: fn.name,
					file: relativePath,
					line: fn.line,
					complexity: fn.complexity,
					coverage: Math.round(coverage),
					crap: Math.round(crap * 100) / 100,
				});
			}
		}
	}

	if (results.length === 0) {
		console.log(`\n✅ All functions have CRAP score ≤ ${threshold}.\n`);
		return;
	}

	results.sort((left, right) => right.crap - left.crap);

	console.log(`\n⚠️  CRAP SCORE THRESHOLD EXCEEDED (max: ${threshold})`);
	console.log('━'.repeat(70));
	console.log('Functions with high complexity and low test coverage.\n');
	console.log(
		`${'CRAP'.padStart(6)}  ${'Comp'.padStart(4)}  ${'Cov%'.padStart(4)}  Function`,
	);
	console.log(`${'─'.repeat(6)}  ${'─'.repeat(4)}  ${'─'.repeat(4)}  ${'─'.repeat(50)}`);

	for (const r of results) {
		const crapStr = r.crap.toFixed(1).padStart(6);
		const compStr = String(r.complexity).padStart(4);
		const covStr = `${r.coverage}%`.padStart(4);
		console.log(`${crapStr}  ${compStr}  ${covStr}  ${r.name} (${r.file}:${r.line})`);
	}

	console.log(`\n${'━'.repeat(70)}`);
	console.log(`${results.length} function(s) exceed CRAP threshold of ${threshold}.`);
	console.log('Refactor to reduce complexity or add tests to increase coverage.\n');
}

main();
