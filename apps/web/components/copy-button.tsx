'use client';

import { Check, ContentCopy } from '@material-symbols-svg/react/rounded';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  text: string;
  className?: string;
}

function copyFromSelection(text: string): boolean {
  const activeElement = document.activeElement;
  const textArea = document.createElement('textarea');

  textArea.value = text;
  textArea.readOnly = true;
  textArea.style.position = 'fixed';
  textArea.style.inset = '0 auto auto -9999px';
  textArea.style.opacity = '0';
  textArea.style.pointerEvents = 'none';

  document.body.append(textArea);
  textArea.focus({ preventScroll: true });
  textArea.select();
  textArea.setSelectionRange(0, text.length);

  let copied = false;

  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  } finally {
    textArea.remove();

    if (activeElement instanceof HTMLElement) {
      activeElement.focus();
    }
  }

  return copied;
}

export function CopyButton({ text, className }: CopyButtonProps): React.ReactElement {
  const [copied, setCopied] = useState(false);

  const handleCopy = (): void => {
    const copiedFromSelection = copyFromSelection(text);
    const showCopiedState = (): void => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };

    let clipboardWrite: Promise<void> | undefined;

    try {
      clipboardWrite = navigator.clipboard?.writeText(text);
    } catch {
      clipboardWrite = undefined;
    }

    if (copiedFromSelection) {
      showCopiedState();
    }

    clipboardWrite?.then(
      () => {
        if (!copiedFromSelection) {
          showCopiedState();
        }
      },
      () => {
        // The synchronous selection copy already had its chance in the click gesture.
      },
    );
  };

  return (
    <Button
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
      className={cn('size-8 shrink-0 cursor-pointer p-0', className)}
      onClick={handleCopy}
      size="sm"
      type="button"
      variant="ghost"
    >
      {copied ? (
        <Check aria-hidden="true" className="size-4 text-primary" />
      ) : (
        <ContentCopy aria-hidden="true" className="size-4" />
      )}
    </Button>
  );
}
