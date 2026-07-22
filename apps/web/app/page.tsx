import { Agents } from './_components/agents';
import { GetStarted } from './_components/get-started';
import { Header } from './_components/header';
import { ProductDive } from './_components/product-dive';
import { SupportedMarquee } from './_components/supported-marquee';

export default function HomePage(): React.ReactElement {
  return (
    <div className="flex min-w-0 flex-col [&>*]:min-w-0">
      <Header />
      <ProductDive />
      <Agents />
      <div className="py-24 sm:py-32"><SupportedMarquee /></div>
      <GetStarted />
    </div>
  );
}
