import Link from 'next/link';

export function Brand({
  href = '/',
}: {
  href?: string;
}): React.ReactElement {
  return (
    <Link className="inline-flex items-center gap-2 font-semibold tracking-tight" href={href}>
      <img alt="" className="h-8 w-8" src="/codegraphy-icon.svg" />
      <span>CodeGraphy</span>
    </Link>
  );
}
