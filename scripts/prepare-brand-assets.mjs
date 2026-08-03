import fs from 'node:fs';
import path from 'node:path';

const sourceRoot = path.resolve('assets-b64');
const publicRoot = path.resolve('public');

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const current = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(current) : [current];
  });
}

const encodedFiles = walk(sourceRoot).filter(file => file.endsWith('.b64'));
for (const encodedFile of encodedFiles) {
  const relative = path.relative(sourceRoot, encodedFile).replace(/\.b64$/, '');
  const target = path.join(publicRoot, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const encoded = fs.readFileSync(encodedFile, 'utf8').trim();
  fs.writeFileSync(target, Buffer.from(encoded, 'base64'));
}

console.log(`Identidade Queijos WR preparada: ${encodedFiles.length} arquivos.`);
