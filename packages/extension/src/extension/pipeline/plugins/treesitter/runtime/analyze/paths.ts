import { resolvePythonModulePath as readPythonModulePath } from '../analyzePython/paths';
import { resolveRustModuleDeclarationPath as readRustModuleDeclarationPath } from '../analyzeRust/moduleDeclarationPath';
import { resolveRustUsePath as readRustUsePath } from '../analyzeRust/usePath';

export const resolvePythonModulePath = readPythonModulePath;
export const resolveRustModuleDeclarationPath = readRustModuleDeclarationPath;
export const resolveRustUsePath = readRustUsePath;
