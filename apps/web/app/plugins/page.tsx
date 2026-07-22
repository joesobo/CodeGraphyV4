import type { Metadata } from 'next';
import { PageSidebar } from '@/components/nav/page-sidebar';
import { pluginNavGroups } from '@/content/navigation';
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
      <div className="mx-auto w-full max-w-[90rem] px-5 py-16 sm:px-8 sm:py-20 lg:px-12" id="page-content">
        <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-10">
          <PageSidebar nav={pluginNavGroups} />
          <div className="grid min-w-0 gap-16 sm:gap-20">
            <PluginFeatures />
            <PluginList />
            <PluginInstall />
            <Build />
          </div>
        </div>
      </div>
    </div>
  );
}
