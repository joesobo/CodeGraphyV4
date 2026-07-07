import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { ImageResponse } from 'next/og';

const colors = {
  background: '#f8fbfd',
  foreground: '#0d2538',
  graphBackground: '#f1f1f1',
  muted: '#5c6e7d',
  primary: '#0073bc',
  primarySoft: '#e8f1f7',
  primaryBorder: '#0073bc29',
  shadow: '#0d253829',
} as const;

const image = {
  height: 630,
  width: 1200,
} as const;

// Next reads these named exports by convention for generated metadata image routes.
export const alt = 'CodeGraphy social preview with a relationship graph';
export const contentType = 'image/png';
export const size = image;

export default async function OpenGraphImage(): Promise<ImageResponse> {
  const brandMarkSvg = await readFile(new URL('../public/codegraphy-dark.svg', import.meta.url), 'utf8');
  const firaCodeBoldFont = await readFile(new URL('../public/fonts/FiraCode-Bold.ttf', import.meta.url));
  const firaCodeRegularFont = await readFile(new URL('../public/fonts/FiraCode-Regular.ttf', import.meta.url));
  const graphImage = await readFile(new URL('../public/media/social/codegraphy-graph.png', import.meta.url));

  const brandMarkSrc = `data:image/svg+xml;base64,${Buffer.from(brandMarkSvg).toString('base64')}`;
  const graphSrc = `data:image/png;base64,${graphImage.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: colors.background,
          color: colors.foreground,
          display: 'flex',
          fontFamily: 'Fira Code',
          gap: 44,
          height: '100%',
          overflow: 'hidden',
          padding: 72,
          position: 'relative',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 56,
            position: 'relative',
            width: 500,
          }}
        >
          <div style={{ alignItems: 'center', display: 'flex', gap: 18 }}>
            <img alt="" height={58} src={brandMarkSrc} width={58} />
            <div style={{ display: 'flex', fontSize: 40, fontWeight: 700 }}>CodeGraphy</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div
              style={{
                alignSelf: 'flex-start',
                background: colors.primarySoft,
                border: `1px solid ${colors.primaryBorder}`,
                borderRadius: 999,
                color: colors.primary,
                display: 'flex',
                fontSize: 22,
                fontWeight: 700,
                padding: '10px 16px',
              }}
            >
              Relationship Graph
            </div>
            <div style={{ display: 'flex', fontSize: 66, fontWeight: 700, lineHeight: 1.02 }}>
              See how your workspace connects.
            </div>
            <div
              style={{
                color: colors.muted,
                display: 'flex',
                fontSize: 28,
                lineHeight: 1.35,
              }}
            >
              Files, symbols, and relationships indexed once for editors, agents, and plugins.
            </div>
          </div>
        </div>

        <div
          style={{
            background: colors.graphBackground,
            border: `1px solid ${colors.graphBackground}`,
            borderRadius: 24,
            boxShadow: `0 24px 80px ${colors.shadow}`,
            display: 'flex',
            height: 448,
            overflow: 'hidden',
            position: 'relative',
            width: 500,
          }}
        >
          <img
            alt=""
            height={448}
            src={graphSrc}
            style={{ objectFit: 'contain', objectPosition: 'center' }}
            width={500}
          />
        </div>
      </div>
    ),
    {
      fonts: [
        {
          data: firaCodeRegularFont,
          name: 'Fira Code',
          weight: 400,
        },
        {
          data: firaCodeBoldFont,
          name: 'Fira Code',
          weight: 700,
        },
      ],
      ...size,
    },
  );
}
