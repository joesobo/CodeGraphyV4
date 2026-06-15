const STYLE_ID = 'cg-particles-plugin-style';

export function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .cg-bg-particles-section { display: flex; flex-direction: column; gap: 0.5rem; }
    .cg-bg-particles-canvas { height: 100%; inset: 0; pointer-events: none; position: absolute; width: 100%; }
    .cg-bg-particles-header { align-items: center; background: transparent; border: 0; border-radius: 0.375rem; color: var(--cg-muted-foreground); cursor: pointer; display: flex; justify-content: space-between; padding: 0.25rem; text-align: left; transition: background 120ms ease; width: 100%; }
    .cg-bg-particles-header:hover { background: var(--cg-accent-faint); }
    .cg-bg-particles-heading { color: var(--cg-muted-foreground); font-size: 0.75rem; font-weight: 600; letter-spacing: 0; line-height: 1rem; margin: 0; text-transform: uppercase; }
    .cg-bg-particles-chevron-shell { align-items: center; color: var(--cg-muted-foreground); display: inline-flex; flex: 0 0 auto; height: 1rem; justify-content: center; width: 1rem; }
    .cg-bg-particles-chevron { display: block; height: 1rem; width: 1rem; }
    .cg-bg-particles-section[data-collapsed='true'] .cg-bg-particles-grid { display: none; }
    .cg-bg-particles-grid { background: var(--cg-surface-subtle); border: 1px solid var(--cg-border-subtle); border-radius: 0.375rem; display: grid; grid-template-columns: 1fr; overflow: hidden; }
    .cg-bg-particles-row { align-items: center; display: flex; gap: 0.75rem; justify-content: space-between; min-width: 0; padding: 0.5rem 0.75rem; transition: background 120ms ease; }
    .cg-bg-particles-row + .cg-bg-particles-row { border-top: 1px solid var(--cg-divider-subtle); }
    .cg-bg-particles-row:hover { background: var(--cg-accent-subtle); }
    .cg-bg-particles-row > span { color: var(--cg-foreground); flex: 1; font-size: 0.75rem; font-weight: 500; line-height: 1rem; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cg-bg-particles-switch { align-items: center; background: var(--cg-input); border: 2px solid transparent; border-radius: 999px; box-shadow: 0 1px 2px color-mix(in srgb, var(--cg-shadow) 40%, transparent); cursor: pointer; display: inline-flex; flex: 0 0 auto; height: 1.25rem; padding: 0; transition: background 120ms ease, opacity 120ms ease; width: 2.25rem; }
    .cg-bg-particles-switch:focus-visible { outline: 2px solid var(--cg-focus-border); outline-offset: 2px; }
    .cg-bg-particles-switch[data-state='checked'] { background: var(--cg-primary); }
    .cg-bg-particles-switch > span { background: var(--cg-background); border-radius: 999px; box-shadow: 0 1px 3px color-mix(in srgb, var(--cg-shadow) 65%, transparent); display: block; height: 1rem; transform: translateX(0); transition: transform 120ms ease; width: 1rem; }
    .cg-bg-particles-switch[data-state='checked'] > span { transform: translateX(1rem); }
  `;
  document.head.appendChild(style);
}

export function removeStyles(): void {
  document.getElementById(STYLE_ID)?.remove();
}
