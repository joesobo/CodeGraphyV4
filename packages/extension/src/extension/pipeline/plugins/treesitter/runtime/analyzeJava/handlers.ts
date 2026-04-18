import { handleJavaImportDeclaration as readJavaImportDeclaration } from './imports';
import {
  handleJavaMethodDeclaration as readJavaMethodDeclaration,
  handleJavaMethodInvocation as readJavaMethodInvocation,
} from './methods';
import { handleJavaTypeDeclaration as readJavaTypeDeclaration } from './typeDeclarations';
import { resolveJavaSourceInfo as readJavaSourceInfo } from './sourceInfo';

export const handleJavaImportDeclaration = readJavaImportDeclaration;
export const handleJavaMethodDeclaration = readJavaMethodDeclaration;
export const handleJavaMethodInvocation = readJavaMethodInvocation;
export const handleJavaTypeDeclaration = readJavaTypeDeclaration;
export const resolveJavaSourceInfo = readJavaSourceInfo;
