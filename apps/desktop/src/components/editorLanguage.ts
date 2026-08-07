import { LanguageDescription, type LanguageSupport } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { isMarkdownPath } from './markdownPath';

const markdownDescription = LanguageDescription.matchLanguageName(languages, 'Markdown');

export function findEditorLanguage(path: string): LanguageDescription | undefined {
  const filename = path.split(/[\\/]/).at(-1) ?? path;
  return LanguageDescription.matchFilename(languages, filename)
    ?? (isMarkdownPath(path) ? markdownDescription ?? undefined : undefined);
}

export async function loadEditorLanguage(path: string): Promise<LanguageSupport | undefined> {
  return findEditorLanguage(path)?.load();
}
