import Link from 'next/link';
import {
  CreditCard,
  Download,
  Layers3,
  LogOut,
  PackageCheck,
  Pin,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Button } from '../_ui/button';
import { Card } from '../_ui/card';
import { SiteHeader } from '../_site/header';

const privatePluginFeatures = [
  { label: 'Sections', icon: Layers3 },
  { label: 'Pinned nodes', icon: Pin },
  { label: 'Saved setups', icon: Save },
  { label: 'Advanced exports', icon: Download },
];

export function AccountView(): React.ReactElement {
  return (
    <>
      <SiteHeader isSignedIn />
      <main className="mx-auto grid max-w-6xl gap-4 px-5 py-4 md:px-8 md:py-5">
        <section className="grid min-w-0 gap-4 lg:grid-cols-[1fr_0.72fr]">
          <Card className="min-w-0 overflow-hidden bg-card/80 p-5 md:p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="section-kicker-blue mb-3 text-xs font-black uppercase tracking-[0.08em]">
                  CodeGraphy account
                </p>
                <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Account</h1>
                <p className="mt-3 max-w-2xl text-base leading-6 text-muted-foreground">
                  Manage your sign-in, private plugin access, and subscription status.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[hsl(var(--brand-blue)/0.11)] px-3 py-1 text-sm font-bold text-[hsl(var(--brand-blue))]">
                  Signed in
                </span>
                <span className="rounded-full bg-[hsl(var(--brand-orange)/0.12)] px-3 py-1 text-sm font-bold text-[hsl(var(--brand-orange))]">
                  Private plugins enabled
                </span>
              </div>
            </div>
          </Card>

          <Card className="flex min-w-0 items-center gap-4 bg-card/90 p-5">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#2b73bb,#e26c13)]">
              <div className="absolute -left-3 top-4 h-8 w-20 rounded-full border border-white/35" />
              <div className="absolute -right-4 bottom-3 h-8 w-20 rounded-full border border-white/25" />
              <UserRound className="relative text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-muted-foreground">
                Signed in as
              </p>
              <p className="text-base font-black leading-6 sm:truncate sm:text-lg">
                Account:
                <span className="block break-words sm:inline"> maya@codegraphy.dev</span>
              </p>
              <p className="mt-1 text-sm font-semibold text-[hsl(var(--brand-blue))]">Free account</p>
            </div>
          </Card>
        </section>

        <section className="grid min-w-0 gap-4 lg:grid-cols-[1.08fr_0.72fr]">
          <Card className="min-w-0 bg-card/90 p-5 md:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[hsl(var(--brand-blue))]">
                  <PackageCheck size={19} />
                  <h2 className="text-2xl font-black text-foreground">Private plugins</h2>
                </div>
                <p className="max-w-2xl leading-6 text-muted-foreground">
                  Focused add-ons for keeping the graph organized once the map starts matching how your code actually behaves.
                </p>
              </div>
              <span className="w-fit rounded-md bg-[hsl(var(--brand-blue)/0.11)] px-3 py-1.5 text-sm font-black text-[hsl(var(--brand-blue))]">
                1 active
              </span>
            </div>

            <div className="mt-5 border-t border-border pt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-2xl font-black">Organize: Active</p>
                  <p className="mt-2 max-w-2xl leading-6 text-muted-foreground">
                    Pins, sections, saved setups, and polished graph organization tools.
                  </p>
                </div>
                <span className="flex w-fit items-center gap-2 rounded-full bg-[hsl(var(--brand-orange)/0.12)] px-3 py-1 text-sm font-bold text-[hsl(var(--brand-orange))]">
                  <ShieldCheck size={15} />
                  Active
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {privatePluginFeatures.map(item => {
                  const Icon = item.icon;

                  return (
                    <div
                      className="flex min-h-11 items-center gap-3 rounded-md border border-border/80 bg-background/55 px-3 py-2"
                      key={item.label}
                    >
                      <Icon className="text-[hsl(var(--brand-orange))]" size={17} />
                      <span className="font-semibold">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          <div className="grid min-w-0 gap-5">
            <Card className="min-w-0 bg-card/90 p-5">
              <div className="mb-4 flex items-center gap-2 text-[hsl(var(--brand-blue))]">
                <CreditCard size={18} />
                <h2 className="text-xl font-black text-foreground">Subscription</h2>
              </div>
              <p className="leading-6 text-muted-foreground">
                Billing controls will live here once the Stripe customer portal is connected.
              </p>
              <Button className="mt-4" disabled variant="secondary">
                <CreditCard size={16} />
                Customer portal coming soon
              </Button>
            </Card>

            <Card className="min-w-0 bg-card/90 p-5">
              <div className="mb-4 flex items-center gap-2 text-muted-foreground">
                <LogOut size={18} />
                <h2 className="text-xl font-black text-foreground">Session</h2>
              </div>
              <p className="mb-4 leading-6 text-muted-foreground">
                This prototype session routes back to the sign-in page.
              </p>
              <Button asChild variant="outline">
                <Link href="/login">
                  <LogOut size={16} />
                  Sign out
                </Link>
              </Button>
            </Card>
          </div>
        </section>
      </main>
    </>
  );
}
