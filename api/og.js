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
      width: 210,
      height: 302,
      style: {
        position: 'absolute',
        left: 700 + off * 88 - 105,
        top: 170 + Math.abs(off) * off * 7 + Math.abs(off) * 14,
        borderRadius: 14,
        transform: 'rotate(' + off * 10 + 'deg)',
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
          top: 200,
          fontSize: 62,
          fontWeight: 800,
          color: '#000',
          display: 'flex',
        },
      }, 'MY SANCTUM PULL!'),
      e('div', {
        style: {
          position: 'absolute',
          left: 70,
          top: 300,
          fontSize: 32,
          color: 'rgba(0,0,0,.75)',
          display: 'flex',
        },
      }, 'Pull your Sanctum Furni Pack'),
      ...cards
    ),
    { width: 1200, height: 630, fonts: [{ name: 'Nunito', data: font, weight: 800 }] }
  );
}
