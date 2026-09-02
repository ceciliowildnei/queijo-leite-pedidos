import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/main.jsx');
let source = fs.readFileSync(filePath, 'utf8');

const blockStart = "  const mergePrimary = db.clientes.find(client => String(client.id) === String(mergePrimaryId));";
const blockEnd = "  return (\n    <div className=\"page-stack\">";
const clientsMarker = 'function ClientsPage(';

const firstBlock = source.indexOf(blockStart);
const clientsStart = source.indexOf(clientsMarker);
if (clientsStart < 0) throw new Error('Tela Clientes não encontrada para reparar a mesclagem.');

// A preparação anterior usava o primeiro `return <div className=page-stack>` do arquivo,
// que pertence ao Dashboard. Isso compila, mas gera ReferenceError ao abrir o sistema.
if (firstBlock >= 0 && firstBlock < clientsStart) {
  const wrongReturn = source.indexOf(blockEnd, firstBlock);
  if (wrongReturn < 0) throw new Error('Fim do bloco de mesclagem incorreto não encontrado.');
  const injectedBlock = source.slice(firstBlock, wrongReturn);
  source = source.slice(0, firstBlock) + source.slice(wrongReturn);

  const newClientsStart = source.indexOf(clientsMarker);
  const clientsReturn = source.indexOf(blockEnd, newClientsStart);
  if (clientsReturn < 0) throw new Error('Retorno da tela Clientes não encontrado.');

  source = source.slice(0, clientsReturn) + injectedBlock + source.slice(clientsReturn);
  console.log('Bloco de mesclagem movido do Dashboard para Clientes.');
} else if (firstBlock >= clientsStart) {
  console.log('Bloco de mesclagem já está dentro da tela Clientes.');
} else {
  throw new Error('Bloco de mesclagem não encontrado após a preparação.');
}

// Validação defensiva: Dashboard não pode depender dos estados exclusivos da tela Clientes.
const dashboardStart = source.indexOf('function Dashboard(');
const dashboardEnd = source.indexOf('function ClientsPage(', dashboardStart);
const dashboardSection = source.slice(dashboardStart, dashboardEnd);
for (const forbidden of ['mergePrimaryId', 'mergeDuplicateId', 'mergeOpen', 'mergingClients', 'openMerge(']) {
  if (dashboardSection.includes(forbidden)) throw new Error('Dashboard ainda contém referência indevida: ' + forbidden);
}

const clientsSection = source.slice(source.indexOf('function ClientsPage('), source.indexOf('function ProductsPage('));
for (const required of ['mergePrimaryId', 'mergeDuplicateId', 'openMerge(', 'confirmDirectMerge']) {
  if (!clientsSection.includes(required)) throw new Error('Tela Clientes perdeu a função de mesclagem: ' + required);
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Reparo de runtime da mesclagem validado.');
