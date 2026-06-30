import { SitePageHeader } from '@/components/site/page-header';

export default function PluginsPage(): React.ReactElement {
  return (
    <SitePageHeader eyebrow="Plugins" title="Explore how plugins extend the graph.">
      This page will become a plugin-by-plugin index with anchors, install notes,
      supported node and edge concepts, and links for plugin authors.
    </SitePageHeader>
  );
}
