import { CreditCard, PackageCheck, UserRound } from 'lucide-react';
import { Button } from '../_ui/button';
import { Card } from '../_ui/card';
import { SiteHeader } from '../_site/header';

export function AccountView(): React.ReactElement {
  return (
    <>
      <SiteHeader isSignedIn />
      <main className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-12">
        <div className="mb-8">
          <p className="section-kicker-blue mb-3 text-xs font-black uppercase tracking-[0.08em]">
            CodeGraphy account
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Account</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Manage your account and private plugin subscriptions.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          <Card className="min-w-0 bg-card/90 p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#2b73bb,#e26c13)]">
                <div className="absolute -left-4 top-4 h-6 w-16 rounded-full border border-white/35" />
                <div className="absolute -right-4 bottom-2 h-6 w-16 rounded-full border border-white/25" />
                <UserRound className="relative text-white" size={21} />
              </div>
              <div>
                <h2 className="text-xl font-black">Profile</h2>
                <p className="text-sm text-muted-foreground">Signed in through your account provider.</p>
              </div>
            </div>
            <dl className="grid gap-2">
              <dt className="text-xs font-black uppercase tracking-[0.08em] text-muted-foreground">
                Email
              </dt>
              <dd className="break-words text-lg font-black">maya@codegraphy.dev</dd>
            </dl>
          </Card>

          <Card className="min-w-0 bg-card/90 p-6">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[hsl(var(--brand-blue)/0.11)] text-[hsl(var(--brand-blue))]">
                <CreditCard size={20} />
              </span>
              <div>
                <h2 className="text-xl font-black">Subscription</h2>
                <p className="text-sm text-muted-foreground">Billing management will connect through Stripe.</p>
              </div>
            </div>
            <Button disabled variant="secondary">
              <CreditCard size={16} />
              Customer portal coming soon
            </Button>
          </Card>
        </section>

        <Card className="mt-4 min-w-0 bg-card/90 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[hsl(var(--brand-blue)/0.11)] text-[hsl(var(--brand-blue))]">
                <PackageCheck size={20} />
              </span>
              <div>
                <h2 className="text-xl font-black">Private plugins</h2>
                <p className="text-sm text-muted-foreground">Optional paid plugins attached to this account.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-md border border-border/80 bg-background/55 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-lg font-black">Organize</p>
                <p className="mt-1 leading-6 text-muted-foreground">
                  Sections, pinned nodes, saved setups, and advanced exports.
                </p>
              </div>
              <span className="w-fit whitespace-nowrap rounded-full bg-[hsl(var(--brand-orange)/0.12)] px-3 py-1 text-sm font-bold text-[hsl(var(--brand-orange))]">
                Active
              </span>
            </div>
          </div>
        </Card>
      </main>
    </>
  );
}
