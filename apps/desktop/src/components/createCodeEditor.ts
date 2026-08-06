import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import {
  bracketMatching,
  defaultHighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from '@codemirror/language';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { EditorState } from '@codemirror/state';
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view';

function languageForPath(path: string) {
  if (/\.[cm]?[jt]sx?$/iu.test(path)) {
    return javascript({
      jsx: /x$/iu.test(path),
      typescript: /\.[cm]?tsx?$/iu.test(path),
    });
  }
  return [];
}

export function createCodeEditor({
  content,
  onChange,
  onSave,
  parent,
  path,
}: {
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  parent: HTMLElement;
  path: string;
}): () => void {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        highlightSelectionMatches(),
        highlightActiveLine(),
        languageForPath(path),
        keymap.of([
          { key: 'Mod-s', run: () => { onSave(); return true; } },
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
        ]),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChange(update.state.doc.toString());
        }),
        EditorView.theme({
          '&': { height: '100%', backgroundColor: '#0c161d', color: '#dbe8ee' },
          '.cm-content': { caretColor: '#73e2c4', padding: '18px 0 40px' },
          '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#73e2c4' },
          '.cm-gutters': {
            backgroundColor: '#0c161d',
            borderRight: '1px solid rgba(149, 180, 190, .1)',
            color: '#49616d',
          },
          '.cm-activeLine': { backgroundColor: 'rgba(110, 221, 193, .045)' },
          '.cm-activeLineGutter': { backgroundColor: 'rgba(110, 221, 193, .07)', color: '#88a5af' },
          '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
            backgroundColor: 'rgba(69, 141, 168, .35)',
          },
          '.cm-scroller': { fontFamily: 'var(--font-code)', fontSize: '12.5px', lineHeight: '1.68' },
        }),
      ],
    }),
  });
  view.focus();
  return () => view.destroy();
}
