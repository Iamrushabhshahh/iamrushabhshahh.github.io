/* Converts the same scene definitions into real .excalidraw files so the
   diagrams stay editable at excalidraw.com instead of being baked SVGs. */
import fs from 'node:fs';

let n = 0;
const nid = (p) => `${p}${(n++).toString(36)}${'x'.repeat(4)}`;
let sd = 7;
const seed = () => (sd = (sd * 1103515245 + 12345) % 2147483647);

const BASE = (el) => ({
  version: 1, versionNonce: seed(), isDeleted: false, angle: 0, opacity: 100,
  groupIds: [], frameId: null, boundElements: [], updated: 1, link: null, locked: false,
  strokeStyle: 'solid', fillStyle: 'solid', strokeWidth: 2, roughness: 1, roundness: null,
  strokeColor: '#1e1e1e', backgroundColor: 'transparent', seed: seed(), ...el,
});

const TEXT = (el) => BASE({
  type: 'text', fontFamily: 1, textAlign: 'center', verticalAlign: 'middle',
  lineHeight: 1.25, baseline: 18, containerId: null, ...el,
  originalText: el.text,
});

export function toExcalidraw(elements) {
  const out = [];
  for (const el of elements) {
    const w = el.width ?? 0, h = el.height ?? 0;
    if (el.type === 'text') {
      const fs_ = el.fontSize || 16;
      const est = el.text.split('\n').reduce((m, l) => Math.max(m, l.length), 0) * fs_ * 0.5;
      const x = el.anchor === 'start' ? el.x : el.x - est / 2;
      out.push(TEXT({
        id: nid('t'), x, y: el.y - fs_ / 2, width: est, height: fs_ * 1.25 * el.text.split('\n').length,
        fontSize: fs_, text: el.text, strokeColor: el.strokeColor || '#1e1e1e',
        textAlign: el.anchor === 'start' ? 'left' : 'center',
      }));
      continue;
    }
    const id = nid(el.type[0]);
    const shape = BASE({
      type: el.type, id, x: el.x, y: el.y, width: w, height: h,
      strokeColor: el.strokeColor || '#1e1e1e',
      backgroundColor: el.backgroundColor || 'transparent',
      fillStyle: el.fillStyle || 'solid',
      strokeWidth: el.strokeWidth ?? 2,
      strokeStyle: el.strokeStyle || 'solid',
      roughness: el.roughness ?? 1,
      roundness: el.roundness ? { type: 3 } : null,
    });
    if (el.type === 'arrow' || el.type === 'line') {
      const pts = el.points || [[0, 0], [w, h]];
      shape.points = pts;
      shape.width = Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0]));
      shape.height = Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1]));
      shape.lastCommittedPoint = null;
      shape.startBinding = null;
      shape.endBinding = null;
      shape.startArrowhead = el.startArrowhead || null;
      shape.endArrowhead = el.type === 'arrow' && el.endArrowhead !== null ? 'arrow' : null;
      shape.elbowed = false;
    }
    out.push(shape);
    if (el.label) {
      const tid = nid('l');
      const fs_ = el.label.fontSize || 16;
      shape.boundElements = [{ id: tid, type: 'text' }];
      out.push(TEXT({
        id: tid, x: el.x, y: el.y + h / 2 - fs_ / 2, width: w, height: fs_ * 1.25,
        fontSize: fs_, text: el.label.text, containerId: id,
        strokeColor: el.label.color || '#1e1e1e',
      }));
    }
  }
  return {
    type: 'excalidraw', version: 2, source: 'https://rushabhshah.dev',
    elements: out,
    appState: { gridSize: null, viewBackgroundColor: '#fdfcfa' },
    files: {},
  };
}

export function writeScene(name, elements) {
  fs.mkdirSync('excalidraw', { recursive: true });
  fs.writeFileSync(`excalidraw/${name}.excalidraw`, JSON.stringify(toExcalidraw(elements), null, 1));
}
