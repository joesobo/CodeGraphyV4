import { SitePageHeader } from '@/components/site/page-header';

export default function DocsPage(): React.ReactElement {
  return (
    <SitePageHeader eyebrow="Docs" title="Find the right CodeGraphy documentation.">
      This page will become the public docs hub for extension setup, core concepts,
      built-in plugins, the plugin API, and useful repo references.
    </SitePageHeader>
  );
}
