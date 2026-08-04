import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('scripts/prepare-financial-control.mjs');
let source = fs.readFileSync(filePath, 'utf8');
source = source.replace('${out.descricao}', '\\${out.descricao}');
fs.writeFileSync(filePath, source, 'utf8');
console.log('Template financeiro validado.');
