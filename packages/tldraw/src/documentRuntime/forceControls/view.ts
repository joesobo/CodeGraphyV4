import {
  Fragment,
  createElement,
  type ChangeEvent,
  type CSSProperties,
  type ReactElement,
} from 'react';
import { useEditor, useValue, type TLComponents } from 'tldraw';
import {
  FORCE_CONTROLS,
  readForceSettings,
  type ForceControl,
  type ForceSettings,
} from './model';
import { NodeInspectorPanel } from '../nodeInspector/view';
import { GraphSearchPanel } from '../search/view';

interface DocumentConfig {
  components: TLComponents;
}

interface ConfigScriptContext {
  config: DocumentConfig;
}

const panelStyle = {
  color: 'var(--tl-color-text-1)',
  fontFamily: 'Inter, system-ui, sans-serif',
  left: 12,
  pointerEvents: 'auto',
  position: 'absolute',
  top: 104,
  width: 280,
  zIndex: 300,
} satisfies CSSProperties;

function ForcePanel(): ReactElement {
  const editor = useEditor();
  const page = useValue('CodeGraphy force settings', () => editor.getCurrentPage(), [editor]);
  const settings = readForceSettings(page.meta.codegraphyPhysics);

  function updateSetting(control: ForceControl, event: ChangeEvent<HTMLInputElement>): void {
    const nextSettings = {
      ...settings,
      [control.key]: Number(event.currentTarget.value),
    } satisfies ForceSettings;
    editor.updatePage({
      id: page.id,
      meta: { ...page.meta, codegraphyPhysics: nextSettings },
    });
  }

  return createElement('section', {
    'aria-label': 'CodeGraphy forces',
    'data-codegraphy-force-panel': true,
    style: panelStyle,
  },
  createElement('div', {
    style: {
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: '0.08em',
      marginBottom: 10,
      textTransform: 'uppercase',
    },
  }, 'Forces'),
  ...FORCE_CONTROLS.map(control => {
    const value = settings[control.key];
    const percent = ((value - control.minimum) / (control.maximum - control.minimum)) * 100;
    return createElement('label', {
      key: control.key,
      style: { display: 'block', marginTop: 8 },
    },
    createElement('span', {
      style: {
        display: 'flex',
        fontSize: 13,
        justifyContent: 'space-between',
        marginBottom: 3,
      },
    },
    createElement('span', null, control.label),
    createElement('output', {
      htmlFor: `codegraphy-${control.key}`,
      style: { color: 'var(--tl-color-text-3)', fontFamily: 'ui-monospace, monospace' },
    }, value.toFixed(control.decimals))),
    createElement('input', {
      'aria-label': control.label,
      id: `codegraphy-${control.key}`,
      max: control.maximum,
      min: control.minimum,
      onChange: (event: ChangeEvent<HTMLInputElement>) => updateSetting(control, event),
      step: control.step,
      style: {
        accentColor: 'var(--tl-color-selected)',
        background: `linear-gradient(to right, var(--tl-color-selected) 0%, var(--tl-color-selected) ${percent}%, var(--tl-color-low) ${percent}%, var(--tl-color-low) 100%)`,
        cursor: 'pointer',
        height: 5,
        margin: 0,
        width: '100%',
      },
      type: 'range',
      value,
    }));
  }));
}

export default function createCodeGraphyConfig({ config }: ConfigScriptContext): Partial<DocumentConfig> {
  const ExistingCanvasUi = config.components.InFrontOfTheCanvas;
  function CodeGraphyCanvasUi(): ReactElement {
    return createElement(Fragment, null,
      ExistingCanvasUi ? createElement(ExistingCanvasUi) : null,
      createElement(ForcePanel),
      createElement(GraphSearchPanel),
      createElement(NodeInspectorPanel),
    );
  }
  return {
    components: {
      ...config.components,
      InFrontOfTheCanvas: CodeGraphyCanvasUi,
    },
  };
}
