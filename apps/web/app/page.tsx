import { Agents } from './_components/agents';
import { GetStarted } from './_components/get-started';
import { Header } from './_components/header';
import { ProductDive } from './_components/product-dive';
import { SupportedLanguages } from './_components/supported-languages';

export default function HomePage(): React.ReactElement {
  return (
    <div className="flex min-w-0 flex-col [&>*]:min-w-0">
      <Header />
      <ProductDive />
      <Agents />
      <div className="py-10 sm:py-12"><SupportedLanguages /></div>
      <GetStarted />
    </div>
  );
}
