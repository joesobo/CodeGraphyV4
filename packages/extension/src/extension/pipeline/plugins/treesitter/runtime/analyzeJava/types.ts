import {
  handleJavaMethodDeclaration as readJavaMethodDeclaration,
  handleJavaMethodInvocation as readJavaMethodInvocation,
} from './methods';
import { resolveJavaSourceInfo as readJavaSourceInfo } from './sourceInfo';
import { handleJavaTypeDeclaration as readJavaTypeDeclaration } from './typeDeclarations';

export const handleJavaMethodDeclaration = readJavaMethodDeclaration;
export const handleJavaMethodInvocation = readJavaMethodInvocation;
export const resolveJavaSourceInfo = readJavaSourceInfo;
export const handleJavaTypeDeclaration = readJavaTypeDeclaration;
