import {
  handleJavaMethodDeclaration as readJavaMethodDeclaration,
  handleJavaMethodInvocation as readJavaMethodInvocation,
} from './java/methods';
import { resolveJavaSourceInfo as readJavaSourceInfo } from './java/sourceInfo';
import { handleJavaTypeDeclaration as readJavaTypeDeclaration } from './java/typeDeclarations';

export const handleJavaMethodDeclaration = readJavaMethodDeclaration;
export const handleJavaMethodInvocation = readJavaMethodInvocation;
export const resolveJavaSourceInfo = readJavaSourceInfo;
export const handleJavaTypeDeclaration = readJavaTypeDeclaration;
