import { loadEditorLanguage } from './editorLanguage';

export interface CreateCodeEditorOptions {
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  parent: HTMLElement;
  path: string;
}

export async function createCodeEditor({
  content,
  onChange,
  onSave,
  parent,
  path,
}: CreateCodeEditorOptions): Promise<() => void> {
  const [
    { defaultKeymap, history, historyKeymap, indentWithTab },
    {
      bracketMatching,
      indentOnInput,
      syntaxHighlighting,
    },
    { highlightSelectionMatches, searchKeymap },
    { EditorState },
    { oneDarkHighlightStyle },
    {
      drawSelection,
      dropCursor,
      EditorView,
      highlightActiveLine,
      highlightActiveLineGutter,
      keymap,
      lineNumbers,
    },
    language,
  ] = await Promise.all([
    import('@codemirror/commands'),
    import('@codemirror/language'),
    import('@codemirror/search'),
    import('@codemirror/state'),
    import('@codemirror/theme-one-dark'),
    import('@codemirror/view'),
    loadEditorLanguage(path),
  ]);
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
        syntaxHighlighting(oneDarkHighlightStyle),
        highlightSelectionMatches(),
        highlightActiveLine(),
        language ?? [],
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
          '&': { height: '100%', backgroundColor: 'var(--cg-editor)', color: '#abb2bf' },
          '.cm-content': { caretColor: 'var(--cg-accent)', padding: '18px 0 40px' },
          '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--cg-accent)' },
          '.cm-gutters': {
            backgroundColor: 'var(--cg-editor-gutter)',
            borderRight: '1px solid var(--cg-divider)',
            color: 'var(--cg-text-quiet)',
          },
          '.cm-activeLine': { backgroundColor: 'var(--cg-editor-active-line)' },
          '.cm-activeLineGutter': { backgroundColor: 'var(--cg-editor-active-gutter)', color: 'var(--cg-text-secondary)' },
          '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
            backgroundColor: 'var(--cg-editor-selection)',
          },
          '.cm-scroller': { fontFamily: 'var(--cg-font-mono)', fontSize: '12.5px', lineHeight: '1.68' },
        }),
      ],
    }),
  });
  return () => view.destroy();
}
