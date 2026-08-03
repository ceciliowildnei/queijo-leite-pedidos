import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/main.jsx');
let source = fs.readFileSync(filePath, 'utf8');

const replacements = [
  ["'Entrar no ERP'", "'Entrar'"],
  ['>ERP Queijos WR<', '>Queijos WR<'],
  ['>Queijos WR ERP<', '>Queijos WR<'],
  ['>ERP Gestão<', '>Gestão<'],
  ['Queijos WR ERP', 'Queijos WR']
];

for (const [from, to] of replacements) {
  source = source.split(from).join(to);
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Textos visíveis preparados: botão de login = Entrar.');
