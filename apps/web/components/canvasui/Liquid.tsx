'use client';

// Adapted from Canvas UI Liquid for the CodeGraphy hero.
// Source: https://canvasui.dev/docs/components/liquid

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createLiquid, supportsHtmlInCanvas } from './liquid/runtime';
import type { LiquidInstance, LiquidProps } from './liquid/types';

const emptySubscribe = (): (() => void) => () => {};
const getServerSupport = (): boolean => false;

export function Liquid({
  children,
  className,
  interactionTargetRef,
  style,
  ...options
}: LiquidProps): React.ReactElement {
  const sourceRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<LiquidInstance | null>(null);
  const [initialOptions] = useState(options);
  const [failed, setFailed] = useState(false);
  const supported = useSyncExternalStore(
    emptySubscribe,
    supportsHtmlInCanvas,
    getServerSupport,
  );
  const native = supported && !failed;

  useEffect(() => {
    const source = sourceRef.current;
    const content = contentRef.current;
    const output = outputRef.current;
    if (!source || !content || !output) return;

    instanceRef.current = createLiquid(
      {
        source,
        content,
        interactionTarget: interactionTargetRef?.current ?? undefined,
        output,
      },
      initialOptions,
    );
    if (native && !instanceRef.current) setFailed(true);

    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, [initialOptions, interactionTargetRef, native]);

  useEffect(() => {
    instanceRef.current?.setOptions(options);
  });

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      <canvas
        ref={sourceRef}
        // @ts-expect-error experimental html-in-canvas attribute
        layoutsubtree="true"
        suppressHydrationWarning
        style={
          native
            ? { position: 'absolute', inset: 0, width: '100%', height: '100%' }
            : { display: 'none' }
        }
      >
        {native ? (
          <div
            ref={contentRef}
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              overflow: 'auto',
            }}
          >
            {children}
          </div>
        ) : null}
      </canvas>
      {!native ? (
        <div
          ref={contentRef}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'auto',
          }}
        >
          {children}
        </div>
      ) : null}
      <canvas
        ref={outputRef}
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

export type { LiquidOptions } from './liquid/types';
export default Liquid;
