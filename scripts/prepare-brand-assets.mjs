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

function writeDecoded(relative, encoded) {
  const target = path.join(publicRoot, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, Buffer.from(encoded.replace(/\s+/g, ''), 'base64'));
}

const encodedFiles = walk(sourceRoot).filter(file => file.endsWith('.b64'));
for (const encodedFile of encodedFiles) {
  const relative = path.relative(sourceRoot, encodedFile).replace(/\.b64$/, '');
  writeDecoded(relative, fs.readFileSync(encodedFile, 'utf8'));
}

const partDirs = [];
function collectPartDirs(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const current = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.endsWith('.parts')) partDirs.push(current);
      else collectPartDirs(current);
    }
  }
}
collectPartDirs(sourceRoot);

for (const partDir of partDirs) {
  const relative = path.relative(sourceRoot, partDir).replace(/\.parts$/, '');
  const encoded = fs.readdirSync(partDir)
    .filter(name => name.endsWith('.part'))
    .sort()
    .map(name => fs.readFileSync(path.join(partDir, name), 'utf8'))
    .join('');
  writeDecoded(relative, encoded);
}

console.log(`Identidade Queijos WR preparada: ${encodedFiles.length + partDirs.length} arquivos.`);
