/** Matriz RBAC: perfil -> tela inicial. A autorização real continua sendo imposta pelo back. */
export const HOME_POR_PERFIL: Record<string, string> = {
  OPERADOR: '/operador',     // Tela 04
  SUPERVISOR: '/supervisor', // Tela 03
  GESTOR: '/gestor',         // Tela 02
  ADMIN: '/admin'            // Tela 05
};

export const ITENS_NAV = [
  { to: '/gestor', rotulo: 'Visão executiva', roles: ['GESTOR', 'ADMIN'] },
  { to: '/supervisor', rotulo: 'Supervisão', roles: ['SUPERVISOR', 'ADMIN', 'GESTOR'] },
  { to: '/operador', rotulo: 'Operação', roles: ['OPERADOR', 'ADMIN'] },
  { to: '/admin', rotulo: 'Administração', roles: ['ADMIN'] }
];

/** "Gestor", "gestor " e "GESTOR" viram "GESTOR". */
export function normalizarPerfil(perfil: string | null | undefined): string {
  return String(perfil ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

/** Rota inicial do perfil, ou null se o perfil não for reconhecido. */
export function rotaInicial(perfil: string | null | undefined): string | null {
  return HOME_POR_PERFIL[normalizarPerfil(perfil)] ?? null;
}
