import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { Button } from '../_ui/button';
import { VsCodeIcon } from '../_ui/icons';
import { Brand } from './brand';

export function SiteHeader({
  isSignedIn = false,
}: {
  isSignedIn?: boolean;
}): React.ReactElement {
  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-5 md:px-8">
        <Brand />
        <div className="flex items-center justify-end gap-2">
          {isSignedIn ? (
            <Button asChild className="px-3 sm:px-4" variant="ghost">
              <Link aria-label="Sign out" href="/login">
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign out</span>
              </Link>
            </Button>
          ) : (
            <Button asChild className="hidden sm:inline-flex" variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
          <Button asChild>
            <a href="https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy">
              <VsCodeIcon />
              Install
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
