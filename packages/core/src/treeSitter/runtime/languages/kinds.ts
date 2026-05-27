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
  | 'php'
  | 'python'
  | 'ruby'
  | 'rust'
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
    | 'php'
    | 'python'
    | 'ruby'
    | 'rust'
    | 'swift'
    | 'tsx'
    | 'typeScript';
};
