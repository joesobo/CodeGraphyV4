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
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {
        // Clipboard access can be denied (e.g. unfocused document); keep the button usable.
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
