import { readFile, writeFile, rename, rm, cp } from 'node:fs/promises';
await rename('dist/demo.html', 'dist/index.html');
await rm('docs', { recursive: true, force: true });
await cp('dist', 'docs', { recursive: true });
await writeFile('docs/.nojekyll', '');
const html = await readFile('dist/index.html', 'utf8');
await writeFile('index.html', html.replaceAll('./assets/', './docs/assets/').replaceAll('./favicon.svg', './docs/favicon.svg'));
await writeFile('.nojekyll', '');
