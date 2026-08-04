import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/main.jsx');
let source = fs.readFileSync(filePath, 'utf8');

source = source
  .replace("const LOGO = '/logo-queijos-wr-upload.svg';", "const LOGO = '/logo-queijos-wr-upload.svg';")
  .replace("['produtos', 'Produtos', 'pedidos']", "['produtos', 'Produtos', 'produtos']");

fs.writeFileSync(filePath, source, 'utf8');
console.log('Logo oficial e ícone de Produtos consolidados.');
