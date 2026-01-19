import fs from 'node:fs/promises';
import path from 'node:path';

const [outputDirArg, baseHrefArg] = process.argv.slice(2);

if (!outputDirArg) {
  console.error('Usage: node scripts/patch-storybook-base.mjs <outputDir> [baseHref]');
  process.exit(1);
}

const outputDir = path.resolve(process.cwd(), outputDirArg);
const baseHref = baseHrefArg ?? '/';

if (!baseHref.endsWith('/')) {
  console.error(`Expected baseHref to end with "/": ${baseHref}`);
  process.exit(1);
}

const baseTag = `<base href="${baseHref}" />`;

async function patchHtml(filename) {
  const filePath = path.join(outputDir, filename);

  let html;
  try {
    html = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return;
    throw error;
  }

  const withoutBase = html.replace(/^[ \t]*<base\b[^>]*>\s*\n?/gim, '');

  let patched = withoutBase;

  const charsetRegex = /<meta\s+charset=[^>]*>/i;
  if (charsetRegex.test(patched)) {
    patched = patched.replace(charsetRegex, (match) => `${match}\n    ${baseTag}`);
  } else {
    const headRegex = /<head\b[^>]*>/i;
    patched = patched.replace(headRegex, (match) => `${match}\n    ${baseTag}`);
  }

  if (patched !== html) {
    await fs.writeFile(filePath, patched, 'utf8');
  }
}

await patchHtml('index.html');
await patchHtml('iframe.html');
