export const AIRPORTS = ['GRU', 'GIG', 'BSB', 'SSA', 'REC', 'POA', 'CNF', 'FOR'] as const;

export const AIRPORT_LABELS: Record<(typeof AIRPORTS)[number], string> = {
  GRU: 'GRU · São Paulo',
  GIG: 'GIG · Rio de Janeiro',
  BSB: 'BSB · Brasília',
  SSA: 'SSA · Salvador',
  REC: 'REC · Recife',
  POA: 'POA · Porto Alegre',
  CNF: 'CNF · Belo Horizonte',
  FOR: 'FOR · Fortaleza',
};

export const SUPPLIER_LABELS: Record<string, string> = {
  'supplier-a': 'Fornecedor A',
  'supplier-b': 'Fornecedor B',
  'supplier-c': 'Fornecedor C',
};

export const FAILURE_REASON_LABELS: Record<string, string> = {
  timeout: 'não respondeu a tempo',
  http_error: 'retornou erro',
  network_error: 'falha de conexão',
};
