import Link from 'next/link';
import { Button } from '../_ui/button';
import { Card } from '../_ui/card';
import { Brand } from '../_site/brand';

export function AuthView({
  mode,
}: {
  mode: 'login' | 'signup';
}): React.ReactElement {
  const isLogin = mode === 'login';
  const emailInputId = `${mode}-email`;
  const passwordInputId = `${mode}-password`;

  return (
    <main className="flex min-h-screen flex-col items-center px-5 py-12">
      <Brand />
      <Card className="mt-7 w-full max-w-md p-6">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.08em] text-amber-700">
          CodeGraphy Account
        </p>
        <h1 className="text-3xl font-black tracking-tight">
          {isLogin ? 'Sign in' : 'Create a free account'}
        </h1>

        <form className="mt-6 grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-semibold" htmlFor={emailInputId}>
              Email address
            </label>
            <input
              autoComplete="email"
              className="min-h-10 rounded-md border border-input bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              id={emailInputId}
              name="email"
              type="email"
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-semibold" htmlFor={passwordInputId}>
                Password
              </label>
              {isLogin ? (
                <a className="text-sm font-semibold text-teal-700" href="#forgot-password">
                  Forgot password?
                </a>
              ) : null}
            </div>
            <input
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              className="min-h-10 rounded-md border border-input bg-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              id={passwordInputId}
              name="password"
              type="password"
            />
          </div>
          <Button asChild>
            <Link href="/account">{isLogin ? 'Sign in' : 'Create free account'}</Link>
          </Button>
        </form>

        <div className="my-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm text-muted-foreground">
          <span className="h-px bg-border" />
          <span>or</span>
          <span className="h-px bg-border" />
        </div>

        <div className="grid gap-3">
          <Button asChild variant="outline">
            <Link href="/account">
              <span aria-hidden="true" className="font-black text-blue-500">
                G
              </span>
              Continue with Google
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/account">
              <span
                aria-hidden="true"
                className="rounded-full bg-foreground px-1.5 py-1 text-[10px] font-black leading-none text-background"
              >
                GH
              </span>
              Continue with GitHub
            </Link>
          </Button>
        </div>
      </Card>

      <p className="mt-6 text-muted-foreground">
        {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
        <Link className="font-semibold text-teal-700" href={isLogin ? '/signup' : '/login'}>
          {isLogin ? 'Sign up' : 'Log in'}
        </Link>
      </p>
    </main>
  );
}
