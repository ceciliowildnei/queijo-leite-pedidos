import fs from 'node:fs';
import path from 'node:path';

const publicRoot = path.resolve('public');
const iconPath = path.join(publicRoot, 'brand', 'app-icon-192.webp');
const svgPath = path.join(publicRoot, 'brand', 'app-icon.svg');

if (!fs.existsSync(iconPath)) {
  throw new Error('Ícone móvel não encontrado em public/brand/app-icon-192.webp');
}

const encoded = fs.readFileSync(iconPath).toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#000000"/>
  <image href="data:image/webp;base64,${encoded}" x="0" y="0" width="512" height="512" preserveAspectRatio="xMidYMid slice"/>
</svg>`;

fs.mkdirSync(path.dirname(svgPath), { recursive: true });
fs.writeFileSync(svgPath, svg, 'utf8');
console.log('Ícone PWA Queijos WR preparado.');
