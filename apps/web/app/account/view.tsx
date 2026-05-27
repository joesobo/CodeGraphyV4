import Link from 'next/link';
import { LogOut, PackageCheck, UserRound } from 'lucide-react';
import { Button } from '../_ui/button';
import { Card } from '../_ui/card';
import { SiteFooter } from '../_site/footer';
import { SiteHeader } from '../_site/header';

export function AccountView(): React.ReactElement {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[calc(100vh-8rem)] max-w-7xl px-5 py-20 md:px-8">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.08em] text-amber-700">
          CodeGraphy Account
        </p>
        <h1 className="text-5xl font-black tracking-tight sm:text-7xl">Account</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
          Package status and subscription management land here.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Card className="flex items-center gap-5 p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#65ead4,#ff6f82)]">
              <UserRound className="text-white" />
            </div>
            <p className="text-xl font-black">Account: maya@codegraphy.dev</p>
          </Card>

          <Card className="p-6">
            <div className="mb-3 flex items-center gap-2 text-teal-700">
              <PackageCheck size={18} />
              <h2 className="text-xl font-black text-foreground">Pro packages</h2>
            </div>
            <p className="text-2xl font-black">Organize: Active</p>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-black">Manage subscription</h2>
            <Button className="mt-5" disabled variant="secondary">
              Stripe customer portal coming later
            </Button>
          </Card>

          <Card className="p-6">
            <div className="mb-5 flex items-center gap-2 text-muted-foreground">
              <LogOut size={18} />
              <h2 className="text-xl font-black text-foreground">Session</h2>
            </div>
            <Button asChild variant="outline">
              <Link href="/login">Sign out</Link>
            </Button>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
