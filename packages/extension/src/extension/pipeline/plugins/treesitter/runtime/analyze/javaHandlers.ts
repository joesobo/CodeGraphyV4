import { handleJavaImportDeclaration as readJavaImportDeclaration } from './java/imports';
import {
  handleJavaMethodDeclaration as readJavaMethodDeclaration,
  handleJavaMethodInvocation as readJavaMethodInvocation,
} from './java/methods';
import { handleJavaTypeDeclaration as readJavaTypeDeclaration } from './java/typeDeclarations';
import { resolveJavaSourceInfo as readJavaSourceInfo } from './java/sourceInfo';

export const handleJavaImportDeclaration = readJavaImportDeclaration;
export const handleJavaMethodDeclaration = readJavaMethodDeclaration;
export const handleJavaMethodInvocation = readJavaMethodInvocation;
export const handleJavaTypeDeclaration = readJavaTypeDeclaration;
export const resolveJavaSourceInfo = readJavaSourceInfo;
