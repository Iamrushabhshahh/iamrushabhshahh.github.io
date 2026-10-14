// Minifies the shared stylesheet and script in place, just before deploy.
// The committed files stay readable; only the deployed copies are minified.
// Their URLs already carry a ?v= content hash (stampAssets in build-blog.mjs),
// which is what lets _headers cache them for a year.
import fs from 'node:fs';
import { transform } from 'esbuild';

const FILES = [
  ['style.css', 'css'],
  ['assets/theme.js', 'js'],
];

for (const [file, loader] of FILES) {
  const src = fs.readFileSync(file, 'utf8');
  const { code } = await transform(src, { loader, minify: true, legalComments: 'none' });
  fs.writeFileSync(file, code);
  console.log(`minified  ${file}  ${(src.length / 1024).toFixed(1)} KB -> ${(code.length / 1024).toFixed(1)} KB`);
}
