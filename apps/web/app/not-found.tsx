import type { Metadata } from 'next';
import { Link } from '@/components/link';
import { PageHero } from '@/components/page-hero';
import { buttonVariants } from '@/components/ui/button';
import { homeHref } from '@/content/links';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: {
    follow: false,
    index: false,
  },
};

export default function NotFound(): React.ReactElement {
  return (
    <PageHero
      actions={
        <Link className={buttonVariants()} href={homeHref}>Return home</Link>
      }
      darkImageSrc="/media/ocean-not-found-hero-v2.jpg"
      description="CodeGraphy could not resolve this route. Return to the home graph and keep exploring."
      imageAlt=""
      imagePosition="48% center"
      imageSrc="/media/ocean-not-found-hero-v3.jpg"
      size="tall"
      title="Nothing surfaced here."
      tone="minimal"
    />
  );
}
