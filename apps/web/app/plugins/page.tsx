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
    <div className="mx-auto w-full min-w-0 max-w-7xl space-y-12 px-6 pb-24 sm:px-8 sm:pb-32 lg:px-12">
      <PluginsHeader />
      <PluginFeatures />
      <PluginList />
      <PluginInstall />
      <Build />
    </div>
  );
}
