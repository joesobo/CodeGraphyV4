import type { Metadata } from 'next';
import { Build } from './_components/build';
import { PluginFeatures } from './_components/plugin-features';
import { PluginInstall } from './_components/plugin-install';
import { PluginList } from './_components/plugin-list';
import { PluginsHeader } from './_components/plugins-header';

export const metadata: Metadata = {
  title: 'Plugins',
  description:
    'Official CodeGraphy Plugins — npm packages that teach the Core Package new languages, frameworks, and Relationship Graph effects.',
};

export default function PluginsPage(): React.ReactElement {
  return (
    <div className="route-surface w-full min-w-0">
      <PluginsHeader />
      <div className="mx-auto grid w-full max-w-[90rem] gap-24 px-5 py-24 sm:gap-32 sm:px-8 sm:py-32 lg:px-12" id="page-content">
        <PluginFeatures />
        <PluginList />
        <PluginInstall />
        <Build />
      </div>
    </div>
  );
}
