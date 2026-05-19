/**
 * @fileoverview Host-agnostic Access contracts for CodeGraphy plugins.
 * @module @codegraphy/plugin-api/access
 */

export type CodeGraphyAccessKey = string & {};

export type CodeGraphyAccessState = 'granted' | 'missing' | 'unknown';

export interface IAccessRequest {
  access: CodeGraphyAccessKey;
  workspaceRoot?: string;
  pluginId?: string;
}

export interface IAccessResult {
  access: CodeGraphyAccessKey;
  state: CodeGraphyAccessState;
  reason?: string;
  expiresAt?: string;
}

export interface IAccessProvider {
  id: string;
  provides: readonly CodeGraphyAccessKey[];
  getAccess(request: IAccessRequest): IAccessResult | Promise<IAccessResult>;
}
