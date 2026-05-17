type AdminSeed = {
  id: string;
  nome: string;
  telefone: string;
  pin: string;
  papel: 'Administrador';
};

// Mantém apenas o administrador principal de emergência.
// Administradores adicionados ou removidos pelo usuário não devem ser recriados automaticamente.
const ADMIN_SEEDS: AdminSeed[] = [
  { id: 'admin-wildnei-principal', nome: 'Wildnei', telefone: '18997232533', pin: '1234', papel: 'Administrador' },
];

function onlyNumbers(value: string) {
  return String(value || '').replace(/\D/g, '');
}

function readAdmins() {
  try {
    const raw = localStorage.getItem('qlp_admins');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const currentAdmins = readAdmins();
let changed = false;

for (const seed of ADMIN_SEEDS) {
  const existingIndex = currentAdmins.findIndex((admin: any) => onlyNumbers(admin?.telefone) === seed.telefone);

  if (existingIndex === -1) {
    currentAdmins.push(seed);
    changed = true;
    continue;
  }

  const existing = currentAdmins[existingIndex];
  const fixed = {
    ...existing,
    id: existing.id || seed.id,
    nome: existing.nome || seed.nome,
    telefone: onlyNumbers(existing.telefone || seed.telefone),
    pin: existing.pin || seed.pin,
    papel: existing.papel || seed.papel,
  };

  if (JSON.stringify(existing) !== JSON.stringify(fixed)) {
    currentAdmins[existingIndex] = fixed;
    changed = true;
  }
}

if (changed) {
  localStorage.setItem('qlp_admins', JSON.stringify(currentAdmins));
}
