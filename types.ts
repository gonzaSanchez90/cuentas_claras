export enum Category {
  Water = 'Agua',
  Rent = 'Alquiler',
  Pharmacy = 'Farmacia',
  HouseExpenses = 'Gastos del hogar',
  Internet = 'Internet',
  Electricity = 'Luz',
  SocialSecurity = 'Obra Social',
  Outings = 'Salidas',
  Supermarket = 'Supermercado',
  Subscriptions = 'Suscripciones',
  Phone = 'Teléfono',
  Transport = 'Transporte',
  Misc = 'Varios'
}

export interface Participant {
  id?: string;
  name: string;
  splitPercentage: number;
  userId?: number | null;
  isMe?: boolean; // Solo usado a la hora de crear
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  payerParticipantId: string;
  payerName?: string;
  date: string; // ISO string YYYY-MM-DD
  category: Category | string;
  note?: string;
  monthId: string;
  createdBy?: number;
}

export interface MonthConfig {
  id: string;
  name: string;
  emoji?: string;
  isClosed: boolean;
  createdAt: number;
  creatorId: number;
  participants: Participant[];
}

// Interfaz para múltiples balances
export interface ParticipantBalance {
  participantId: string;
  name: string;
  totalPaid: number;
  fairShare: number;
  balance: number; // Positivo: le deben, Negativo: debes
  splitPercentage: number;
}

export interface BalanceResult {
  totalSpent: number;
  balances: ParticipantBalance[];
}