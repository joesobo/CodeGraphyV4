export type {
  GDScriptDocument,
  GDScriptReferenceType,
  GDScriptRuleContext,
  GDScriptStatement,
  IGDScriptReference,
} from './gdscript/types';

export {
  detectClassNameDeclaration,
} from './gdscript/className';

export {
  parseGDScriptDocument,
} from './gdscript/document';

export {
  isResPath,
  normalizePath,
} from './gdscript/path';

export {
  parseGDScriptResourceReferences,
} from './gdscript/resources';

export {
  stripGDScriptComment,
} from './gdscript/comments';
