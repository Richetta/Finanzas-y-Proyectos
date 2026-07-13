/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Account, Category, Transaction, Project, SavingGoal } from '../types';

export const INITIAL_ACCOUNTS: Account[] = [];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Comida', type: 'Gasto', icon: 'Utensils' },
  { id: 'c2', name: 'Transporte', type: 'Gasto', icon: 'Car' },
  { id: 'c3', name: 'Moto', type: 'Gasto', icon: 'Motorcycle' },
  { id: 'c4', name: 'Alquiler', type: 'Gasto', icon: 'Home' },
  { id: 'c5', name: 'Servicios', type: 'Gasto', icon: 'Tv' },
  { id: 'c6', name: 'Universidad', type: 'Gasto', icon: 'GraduationCap' },
  { id: 'c7', name: 'Entretenimiento', type: 'Gasto', icon: 'Gamepad2' },
  { id: 'c8', name: 'Salud', type: 'Gasto', icon: 'HeartPulse' },
  { id: 'c9', name: 'Inversiones', type: 'Ambos', icon: 'TrendingUp' },
  { id: 'c10', name: 'Trabajo', type: 'Ingreso', icon: 'Briefcase' },
  { id: 'c11', name: 'Stack', type: 'Ingreso', icon: 'Layers' },
  { id: 'c12', name: 'Otros', type: 'Ambos', icon: 'Coins' },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_PROJECTS: Project[] = [];

export const INITIAL_GOALS: SavingGoal[] = [];
