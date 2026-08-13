import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const e = (type, props, ...children) => ({
  type,
  props: { ...props, children: children.length === 1 ? children[0] : children },
});

export default async function handler(req) {
  const url = new URL(req.url);
  const origin = url.origin;
  const slugs = (url.searchParams.get('c') || '').split(',').filter(Boolean).slice(0, 5);
  const font = await fetch(origin + '/fonts/nunito-extrabold.ttf').then((r) => r.arrayBuffer());

  const mid = (slugs.length - 1) / 2;
  const cards = slugs.map((slug, i) => {
    const off = i - mid;
    return e('img', {
      src: origin + '/cards/' + slug + '.jpg',
      width: 190,
      height: 265,
      style: {
        position: 'absolute',
        left: 845 + off * 82 - 95,
        top: 168 + off * off * 9,
        borderRadius: 13,
        transform: 'rotate(' + off * 9 + 'deg)',
        boxShadow: '0 14px 34px rgba(20,30,70,.25)',
      },
    });
  });

  return new ImageResponse(
    e(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: '#ffffff',
          fontFamily: 'Nunito',
          position: 'relative',
        },
      },
      e('img', { src: origin + '/logo.png', width: 250, height: 49, style: { position: 'absolute', left: 70, top: 66 } }),
      e('div', {
        style: {
          position: 'absolute',
          left: 70,
          top: 185,
          fontSize: 56,
          fontWeight: 800,
          color: '#000',
          display: 'flex',
        },
      }, 'MY SANCTUM'),
      e('div', {
        style: {
          position: 'absolute',
          left: 70,
          top: 253,
          fontSize: 56,
          fontWeight: 800,
          color: '#000',
          display: 'flex',
        },
      }, 'PULL!'),
      e('div', {
        style: {
          position: 'absolute',
          left: 70,
          top: 352,
          fontSize: 30,
          color: 'rgba(0,0,0,.75)',
          display: 'flex',
        },
      }, 'Pull your Sanctum Furni Pack'),
      ...cards
    ),
    { width: 1200, height: 630, fonts: [{ name: 'Nunito', data: font, weight: 800 }] }
  );
}
