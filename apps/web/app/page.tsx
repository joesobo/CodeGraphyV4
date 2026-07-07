import { Agents } from './_components/agents';
import { Features } from './_components/features';
import { GetStarted } from './_components/get-started';
import { Header } from './_components/header';
import { HowItWorks } from './_components/how-it-works';
import { SupportedMarquee } from './_components/supported-marquee';
import { Why } from './_components/why';

export default function HomePage(): React.ReactElement {
  return (
    <div className="flex flex-col gap-24 sm:gap-32">
      <Header />
      <HowItWorks />
      <Features />
      <Agents />
      <Why />
      <SupportedMarquee />
      <GetStarted />
    </div>
  );
}
