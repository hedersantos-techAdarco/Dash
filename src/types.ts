export enum TeamName {
  DEBORA = "Time Débora",
  MARILIA = "Time Marília"
}

export interface Consultant {
  extension: string;
  name: string;
  team: TeamName;
}

export interface CallRecord {
  extension: string;
  type: string; // "Ativa", "Receptiva" etc
  status: string; // "Atendida", "Não Atendida" etc
  duration: number;
  timestamp: string;
  consultantName?: string;
  team?: TeamName;
}

export interface DashboardStats {
  totalCalls: number;
  successfulCalls: number;
  successRate: number;
  consultantStats: {
    name: string;
    team: TeamName;
    total: number;
    successful: number;
  }[];
  teamStats: {
    name: TeamName;
    total: number;
    successful: number;
  }[];
}
