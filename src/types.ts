/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TransactionType = 'Ingreso' | 'Gasto' | 'Transferencia';

export interface TransactionItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  category?: string;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  originAccount: string; // Account ID or Name
  destinationAccount?: string; // Account ID or Name (for Transferencia)
  category: string;
  subcategory?: string;
  amount: number;
  description: string;
  tags: string[];
  items?: TransactionItem[];
  receiptImage?: string;
}

export type AccountType = 'Billetera Digital' | 'Banco' | 'Efectivo' | 'Cripto' | 'Inversión' | 'Otro';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currentBalance: number;
  initialBalance: number;
  currency: 'ARS' | 'USD' | 'USDT' | 'BTC';
}

export interface Category {
  id: string;
  name: string;
  type: 'Ingreso' | 'Gasto' | 'Ambos';
  icon: string; // Lucide icon name
}

export interface BudgetItem {
  id: string;
  name: string;
  estimatedAmount: number;
  realAmount: number;
  status: 'Pendiente' | 'Comprado' | 'Pagado';
  isPastPayment?: boolean;
}

export interface ProjectTask {
  id: string;
  name: string;
  completed: boolean;
  category?: string;
  description?: string;
  dueDate?: string;
  amount?: number;
  paymentLink?: string;
  isPayment?: boolean;
  isPastPayment?: boolean;
}

export interface ProjectFile {
  id: string;
  name: string;
  type: 'photo' | 'contract' | 'pdf' | 'link' | 'note';
  urlOrContent: string;
  date: string;
}

export interface ProjectCalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: 'Firma' | 'Pago' | 'Vencimiento' | 'Entrega' | 'Recordatorio';
}

export type ProjectStatus = 'Idea' | 'Planificación' | 'En progreso' | 'Finalizado';
export type ProjectPriority = 'Alta' | 'Media' | 'Baja';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  targetDate: string; // YYYY-MM-DD
  priority: ProjectPriority;
  budgetItems: BudgetItem[];
  tasks: ProjectTask[];
  allocatedAccountIds: string[]; // Financial link: which accounts feed this project
  notes: string;
  files: ProjectFile[];
  calendarEvents: ProjectCalendarEvent[];
}

export interface SavingGoal {
  id: string;
  name: string;
  targetAmount: number;
  accumulatedAmount: number;
  targetDate: string; // YYYY-MM-DD
  projectId?: string;
  isActive?: boolean;
}

export interface SyncConfig {
  sheetId?: string;
  appsScriptUrl?: string;
  syncMode: 'local' | 'direct' | 'script'; // local = simulated, direct = Sheets API, script = Google Apps Script API
  isConnected: boolean;
  lastSync?: string;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  action: string;
  status: 'success' | 'pending' | 'error';
  details: string;
}

export interface ExchangeRates {
  ARS_USD_BLUE: number;
  ARS_USDT: number;
  USD_BTC: number;
  lastUpdated?: string;
}

export interface FixedExpense {
  id: string;
  name: string;
  group: 'Trabajo' | 'Entretenimiento' | 'Alquiler & Hogar' | 'Comida' | 'Reservas & Futuros' | 'Otro';
  subgroup: string;
  amount: number;
  currency: 'ARS' | 'USD' | 'USDT' | 'BTC';
  dueDay: number;
  description?: string;
  paymentLink?: string;
  lastPaidMonth?: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  estimatedPrice: number;
  completed: boolean;
  url?: string;
  store?: string;
}

export interface ShoppingGroup {
  id: string;
  name: string;
  date?: string;
  urgency: 'Alta' | 'Media' | 'Baja';
  url?: string;
  storeLocation?: string;
  items: ShoppingItem[];
}

export interface LoanPayment {
  id: string;
  date: string;
  amount: number;
  accountId: string;
  accountName: string;
}

export interface Loan {
  id: string;
  type: 'prestado' | 'recibido'; // prestado (me deben), recibido (debo)
  person: string;
  amount: number;
  currency: 'ARS' | 'USD' | 'USDT' | 'BTC';
  interestRate?: number;
  startDate: string;
  dueDate?: string;
  status: 'Pendiente' | 'Parcial' | 'Devuelto';
  accountId: string;
  accountName: string;
  payments: LoanPayment[];
  description?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  date: string; // YYYY-MM-DD
  read: boolean;
  category: 'gasto_fijo' | 'loan' | 'project' | 'goal' | 'sync';
  relatedId?: string;
}

export interface PantryItem {
  id: string;
  name: string;
  category: string;
  estimatedPrice: number;
  status: 'Disponible' | 'Agotado';
  frequency?: string;
  lastCheckedDate?: string;
}

