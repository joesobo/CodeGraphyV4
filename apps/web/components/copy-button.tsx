'use client';

import { Check, ContentCopy } from '@material-symbols-svg/react/rounded';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className }: CopyButtonProps): React.ReactElement {
  const [copied, setCopied] = useState(false);

  const handleCopy = (): void => {
    const selectionCopied = copyWithSelection(text);
    const clipboardWrite = navigator.clipboard?.writeText(text);

    if (clipboardWrite === undefined) {
      if (selectionCopied) showCopied();
      return;
    }

    clipboardWrite.then(
      () => {
        showCopied();
      },
      () => {
        if (selectionCopied) showCopied();
      },
    );
  };

  const showCopied = (): void => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
      className={cn('size-11 shrink-0 cursor-pointer p-0', className)}
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
      <span aria-live="polite" className="sr-only">
        {copied ? 'Copied' : ''}
      </span>
    </Button>
  );
}

function copyWithSelection(text: string): boolean {
  const previouslyFocused = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.focus();
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  } finally {
    textarea.remove();
    previouslyFocused?.focus();
  }

  return copied;
}
