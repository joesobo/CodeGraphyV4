import { Agents } from './_components/agents';
import { Features } from './_components/features';
import { GetStarted } from './_components/get-started';
import { Header } from './_components/header';
import { HowItWorks } from './_components/how-it-works';
import { SupportedMarquee } from './_components/supported-marquee';
import { Why } from './_components/why';

export default function HomePage(): React.ReactElement {
  return (
    <div className="flex min-w-0 flex-col [&>*]:min-w-0">
      <Header />
      <div className="py-24 sm:py-32"><HowItWorks /></div>
      <div className="pb-24 sm:pb-32"><Features /></div>
      <Agents />
      <Why />
      <div className="py-24 sm:py-32"><SupportedMarquee /></div>
      <GetStarted />
    </div>
  );
}
