import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { ImageResponse } from 'next/og';

const size = { height: 630, width: 1200 } as const;

export const alt = 'CodeGraphy — Understand the code beneath the surface';
export const contentType = 'image/png';
export { size };

export default async function OpenGraphImage(): Promise<ImageResponse> {
  const brandMarkSvg = await readFile(new URL('../public/codegraphy.svg', import.meta.url), 'utf8');
  const font = await readFile(new URL('../public/fonts/FiraCode-Regular.ttf', import.meta.url));
  const fontBold = await readFile(new URL('../public/fonts/FiraCode-Bold.ttf', import.meta.url));
  const oceanImage = await readFile(new URL('../public/media/ocean-relationship-hero.jpg', import.meta.url));
  const brandMarkSrc = `data:image/svg+xml;base64,${Buffer.from(brandMarkSvg).toString('base64')}`;
  const oceanSrc = `data:image/jpeg;base64,${oceanImage.toString('base64')}`;

  return new ImageResponse(
    (
      <div style={{ background: '#061722', color: '#fff', display: 'flex', fontFamily: 'Fira Code', height: '100%', overflow: 'hidden', position: 'relative', width: '100%' }}>
        <img alt="" height={630} src={oceanSrc} style={{ height: '100%', objectFit: 'cover', position: 'absolute', width: '100%' }} width={1200} />
        <div style={{ background: 'linear-gradient(90deg, rgba(3,18,29,.96) 0%, rgba(3,18,29,.82) 52%, rgba(3,18,29,.2) 100%)', display: 'flex', inset: 0, position: 'absolute' }} />
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', padding: 64, position: 'relative', width: 780 }}>
          <div style={{ alignItems: 'center', display: 'flex', gap: 16 }}>
            <img alt="CodeGraphy mark" height={48} src={brandMarkSrc} width={48} />
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 700 }}>CodeGraphy</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ color: '#61d8ca', display: 'flex', fontSize: 17, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>Relationship Graph</div>
            <div style={{ display: 'flex', fontSize: 68, fontWeight: 700, letterSpacing: -3.5, lineHeight: 0.98 }}>Understand the code beneath the surface.</div>
            <div style={{ color: 'rgba(255,255,255,.66)', display: 'flex', fontSize: 22, lineHeight: 1.45 }}>Local-first Indexing for developers, the VS Code extension, the Core CLI, and shell-capable agents.</div>
          </div>
        </div>
      </div>
    ),
    {
      fonts: [
        { data: font, name: 'Fira Code', weight: 400 },
        { data: fontBold, name: 'Fira Code', weight: 700 },
      ],
      ...size,
    },
  );
}
