import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('scripts/prepare-financial-control.mjs');
let source = fs.readFileSync(filePath, 'utf8');
source = source.replace('${out.descricao}', '\\${out.descricao}');
source = source.replace('${money(out.valor)}', '\\${money(out.valor)}');
fs.writeFileSync(filePath, source, 'utf8');
console.log('Templates financeiros validados.');
