export type TreeSitterLanguageKind =
  | 'c'
  | 'cpp'
  | 'csharp'
  | 'dart'
  | 'go'
  | 'haskell'
  | 'java'
  | 'javascript'
  | 'kotlin'
  | 'lua'
  | 'objectiveC'
  | 'php'
  | 'python'
  | 'ruby'
  | 'rust'
  | 'scala'
  | 'swift'
  | 'tsx'
  | 'typescript';

export type TreeSitterRuntimeBinding = {
  languageKind: TreeSitterLanguageKind;
  language:
    | 'cLanguage'
    | 'cpp'
    | 'csharp'
    | 'dart'
    | 'go'
    | 'haskell'
    | 'java'
    | 'javaScript'
    | 'kotlin'
    | 'lua'
    | 'objectiveC'
    | 'php'
    | 'python'
    | 'ruby'
    | 'rust'
    | 'scala'
    | 'swift'
    | 'tsx'
    | 'typeScript';
};
