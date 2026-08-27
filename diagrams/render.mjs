/* Minimal Excalidraw-scene -> SVG renderer.
   Input: array of excalidraw-ish elements (same shape the excalidraw MCP uses).
   Output: standalone SVG string with rough.js hand-drawn strokes. */
import rough from 'roughjs';

const FONT = "'Inter', ui-sans-serif, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const gen = rough.generator();

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// deterministic seed so repeat runs produce identical files (no git churn)
let seedN = 0;
const seed = () => (seedN = (seedN * 1103515245 + 12345) % 2147483647) + 1;

function opts(el, extra = {}) {
  return {
    seed: seed(),
    roughness: el.roughness ?? 1.1,
    bowing: 1,
    stroke: el.strokeColor || '#1e1e1e',
    strokeWidth: el.strokeWidth ?? 2,
    fill: el.backgroundColor && el.backgroundColor !== 'transparent' ? el.backgroundColor : undefined,
    fillStyle: el.fillStyle || 'solid',
    strokeLineDash: el.strokeStyle === 'dashed' ? [8, 8] : el.strokeStyle === 'dotted' ? [2, 6] : undefined,
    ...extra,
  };
}

function drawableToSvg(d) {
  return gen.toPaths(d).map((p) => {
    const attrs = [
      `d="${p.d}"`,
      `stroke="${p.stroke}"`,
      `stroke-width="${p.strokeWidth}"`,
      `fill="${p.fill || 'none'}"`,
    ];
    if (p.strokeLineDash) attrs.push(`stroke-dasharray="${p.strokeLineDash.join(' ')}"`);
    return `<path ${attrs.join(' ')} stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join('');
}

function textSvg({ x, y, text, fontSize = 16, color = '#1e1e1e', anchor = 'middle', weight = 400, lineHeight = 1.28, mono = false }) {
  const lines = String(text).split('\n');
  const total = (lines.length - 1) * fontSize * lineHeight;
  const start = y - total / 2;
  const fam = mono ? "'Fira Code', ui-monospace, Menlo, Consolas, monospace" : FONT;
  return lines.map((ln, i) =>
    `<text x="${x}" y="${(start + i * fontSize * lineHeight).toFixed(1)}" font-family="${fam}" font-size="${fontSize}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}" dominant-baseline="central" style="white-space:pre">${esc(ln)}</text>`
  ).join('');
}

function arrowHead(x1, y1, x2, y2, el) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const len = 13, spread = 0.44;
  const wing = (a) => [x2 - len * Math.cos(ang + a), y2 - len * Math.sin(ang + a)];
  return drawableToSvg(gen.linearPath(
    [wing(spread), [x2, y2], wing(-spread)],
    opts(el, { fill: undefined, strokeLineDash: undefined })
  ));
}

export function renderScene(elements, { width, height, title = 'Diagram', bg = '#fdfcfa' }) {
  const body = [];
  for (const el of elements) {
    const { x = 0, y = 0, width: w = 0, height: h = 0 } = el;
    if (el.type === 'rectangle') {
      body.push(el.roundness
        ? drawableToSvg(gen.path(roundRectPath(x, y, w, h, Math.min(14, w / 4, h / 4)), opts(el)))
        : drawableToSvg(gen.rectangle(x, y, w, h, opts(el))));
    } else if (el.type === 'ellipse') {
      body.push(drawableToSvg(gen.ellipse(x + w / 2, y + h / 2, w, h, opts(el))));
    } else if (el.type === 'line' || el.type === 'arrow') {
      const pts = (el.points || [[0, 0], [w, h]]).map(([dx, dy]) => [x + dx, y + dy]);
      body.push(drawableToSvg(gen.linearPath(pts, opts(el, { fill: undefined }))));
      const [ax, ay] = pts[pts.length - 2], [bx, by] = pts[pts.length - 1];
      if (el.type === 'arrow' && el.endArrowhead !== null) body.push(arrowHead(ax, ay, bx, by, el));
      if (el.startArrowhead) {
        const [cx, cy] = pts[1], [dx2, dy2] = pts[0];
        body.push(arrowHead(cx, cy, dx2, dy2, el));
      }
    } else if (el.type === 'text') {
      body.push(textSvg({
        x: el.x, y: el.y, text: el.text, fontSize: el.fontSize || 16,
        color: el.strokeColor || '#1e1e1e', anchor: el.anchor || 'start',
        weight: el.weight || 400, mono: el.mono,
      }));
      continue;
    }
    if (el.label) {
      body.push(textSvg({
        x: x + w / 2, y: y + h / 2, text: el.label.text,
        fontSize: el.label.fontSize || 16, color: el.label.color || '#1e1e1e',
        weight: el.label.weight || 400, mono: el.label.mono,
      }));
    }
  }
  /* Footer. These diagrams get screenshotted and forwarded on their own, so each
     one carries enough context to stand up without the post around it: what
     release it describes on the left, where it came from on the right. Both are
     faint enough not to compete with the diagram itself. */
  const mark = [
    `<text x="20" y="${height - 13}" font-family=${JSON.stringify(FONT)} font-size="11.5" letter-spacing="0.3" fill="#1b1f23" fill-opacity="0.34">Kubernetes v1.37 &#183; Garhwal</text>`,
    `<text x="${width - 20}" y="${height - 13}" font-family=${JSON.stringify(FONT)} font-size="11.5" letter-spacing="0.3" fill="#1b1f23" fill-opacity="0.22" text-anchor="end">rushabhshah.dev</text>`,
  ].join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="t"><title id="t">${esc(title)}</title><rect width="${width}" height="${height}" rx="14" fill="${bg}"/>${body.join('')}${mark}</svg>`;
}

function roundRectPath(x, y, w, h, r) {
  return `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
}
