export interface CallRecord {
  id: string;
  timestamp: Date;
  extension: string;
  agent: string;
  duration: number; // in seconds
  status: 'Atendida' | 'Perdida';
  type: 'Origem' | 'Destino';
}

export interface DashboardFilters {
  dateRange: [Date | null, Date | null];
  agent: string;
  status: string;
  type: string;
}

export interface KPIStats {
  totalCalls: number;
  totalReceived: number;
  totalMade: number;
  tma: number; // Tempo Médio de Atendimento
  successRate: number;
  lostRate: number;
}
