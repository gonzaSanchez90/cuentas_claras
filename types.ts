export enum User {
    Me = 'Me',
    Partner = 'Partner'
}

export enum Category {
    Rent = 'Alquiler',
    Electricity = 'Luz',
    Water = 'Agua',
    Internet = 'Internet',
    Phone = 'Teléfono',
    Transport = 'Transporte',
    SocialSecurity = 'Obra Social',
    Supermarket = 'Supermercado',
    HouseExpenses = 'In-house', // Mapped as requested
    Outings = 'Salidas',
    Pharmacy = 'Farmacia',
    Subscriptions = 'Suscripciones',
    Misc = 'Varios'
}

export interface Expense {
    id: string;
    title: string;
    amount: number;
    payer: User;
    date: string; // ISO string YYYY-MM-DD
    category: Category;
    note?: string;
    monthId: string;
}

export interface MonthConfig {
    id: string;
    name: string; // e.g., "Agosto 2024" or "Vacaciones Brasil"
    splitRatio: number; // Percentage for "Me". e.g., 60 means I pay 60%, Partner pays 40%
    isClosed: boolean;
    createdAt: number;
}

export interface BalanceResult {
    totalSpent: number;
    paidByMe: number;
    paidByPartner: number;
    myFairShare: number;
    partnerFairShare: number;
    balance: number; // Positive: Partner owes Me. Negative: Me owes Partner.
}