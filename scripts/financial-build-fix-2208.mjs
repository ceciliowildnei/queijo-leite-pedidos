import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('scripts/prepare-financial-control.mjs');
let source = fs.readFileSync(filePath, 'utf8');
source = source.replace(
  "    addLog('Saída lançada', \\`${out.descricao} · \\${money(out.valor)}\\`);",
  "    addLog('Saída lançada', out.descricao + ' · ' + money(out.valor));"
);
fs.writeFileSync(filePath, source, 'utf8');
console.log('Geração financeira corrigida.');
