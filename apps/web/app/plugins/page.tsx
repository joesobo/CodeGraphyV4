import type { Metadata } from 'next';
import { Build } from './_components/build';
import { PluginFeatures } from './_components/plugin-features';
import { PluginInstall } from './_components/plugin-install';
import { PluginList } from './_components/plugin-list';
import { PluginsHeader } from './_components/plugins-header';

export const metadata: Metadata = {
  title: 'Plugins',
  description:
    'Official CodeGraphy plugins — npm packages that teach the core engine new languages, frameworks, and graph effects.',
};

export default function PluginsPage(): React.ReactElement {
  return (
    <div className="min-w-0 space-y-12">
      <PluginsHeader />
      <PluginFeatures />
      <PluginList />
      <PluginInstall />
      <Build />
    </div>
  );
}
