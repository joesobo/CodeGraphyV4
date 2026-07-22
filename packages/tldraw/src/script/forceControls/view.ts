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

interface DocumentConfig {
  components: TLComponents;
}

interface ConfigScriptContext {
  config: DocumentConfig;
}

const panelStyle = {
  color: 'var(--color-text-1)',
  fontFamily: 'Inter, system-ui, sans-serif',
  pointerEvents: 'auto',
  position: 'absolute',
  right: 12,
  top: 320,
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
      style: { color: 'var(--color-text-3)', fontFamily: 'ui-monospace, monospace' },
    }, value.toFixed(control.decimals))),
    createElement('input', {
      'aria-label': control.label,
      id: `codegraphy-${control.key}`,
      max: control.maximum,
      min: control.minimum,
      onChange: (event: ChangeEvent<HTMLInputElement>) => updateSetting(control, event),
      step: control.step,
      style: {
        accentColor: '#2e9b45',
        background: `linear-gradient(to right, #2e9b45 0%, #2e9b45 ${percent}%, #46534c ${percent}%, #46534c 100%)`,
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
    );
  }
  return {
    components: {
      ...config.components,
      InFrontOfTheCanvas: CodeGraphyCanvasUi,
    },
  };
}
