/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Account, Transaction, Category, Project, SavingGoal, SyncConfig, SyncLogEntry, FixedExpense, ShoppingItem, Loan, ShoppingGroup, PantryItem } from '../types';
import { INITIAL_ACCOUNTS, INITIAL_CATEGORIES, INITIAL_TRANSACTIONS, INITIAL_PROJECTS, INITIAL_GOALS } from '../data/initialData';

// Storage keys

const ACCOUNTS_KEY = 'fp_accounts';
const CATEGORIES_KEY = 'fp_categories';
const TRANSACTIONS_KEY = 'fp_transactions';
const PROJECTS_KEY = 'fp_projects';
const GOALS_KEY = 'fp_goals';
const FIXED_EXPENSES_KEY = 'fp_fixed_expenses';
const SYNC_CONFIG_KEY = 'fp_sync_config';
const SYNC_LOGS_KEY = 'fp_sync_logs';
const OFFLINE_QUEUE_KEY = 'fp_offline_queue';
const SHOPPING_GROUPS_KEY = 'fp_shopping_groups';
const LOANS_KEY = 'fp_loans';

const PANTRY_KEY = 'fp_pantry';

const INITIAL_PANTRY: PantryItem[] = [
  { id: 'pantry_1', name: 'Desodorante', category: 'Higiene Personal', estimatedPrice: 3200, status: 'Disponible' },
  { id: 'pantry_2', name: 'Talco', category: 'Higiene Personal', estimatedPrice: 1800, status: 'Disponible' },
  { id: 'pantry_3', name: 'Limpia Piso', category: 'Limpieza', estimatedPrice: 1500, status: 'Disponible' },
  { id: 'pantry_4', name: 'Rejilla de Cocina', category: 'Limpieza', estimatedPrice: 800, status: 'Disponible' },
  { id: 'pantry_5', name: 'Cepillo de Dientes', category: 'Higiene Personal', estimatedPrice: 2200, status: 'Disponible' }
];

export function getLocalPantry(): PantryItem[] {
  const data = localStorage.getItem(PANTRY_KEY);
  if (!data) {
    localStorage.setItem(PANTRY_KEY, JSON.stringify(INITIAL_PANTRY));
    return INITIAL_PANTRY;
  }
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : INITIAL_PANTRY;
  } catch {
    return INITIAL_PANTRY;
  }
}

export function saveLocalPantry(pantry: PantryItem[]) {
  localStorage.setItem(PANTRY_KEY, JSON.stringify(pantry));
}


export function getLocalLoans(): Loan[] {
  const data = localStorage.getItem(LOANS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveLocalLoans(loans: Loan[]) {
  localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
}

export function getLocalAccounts(): Account[] {
  const data = localStorage.getItem(ACCOUNTS_KEY);
  if (!data) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(INITIAL_ACCOUNTS));
    return INITIAL_ACCOUNTS;
  }
  return JSON.parse(data);
}

export function saveLocalAccounts(accounts: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function getLocalCategories(): Category[] {
  const data = localStorage.getItem(CATEGORIES_KEY);
  if (!data) {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(INITIAL_CATEGORIES));
    return INITIAL_CATEGORIES;
  }
  return JSON.parse(data);
}

export function saveLocalCategories(categories: Category[]) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

export function getLocalTransactions(): Transaction[] {
  const data = localStorage.getItem(TRANSACTIONS_KEY);
  if (!data) {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(INITIAL_TRANSACTIONS));
    return INITIAL_TRANSACTIONS;
  }
  return JSON.parse(data);
}

export function saveLocalTransactions(transactions: Transaction[]) {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
}

export function getLocalProjects(): Project[] {
  const data = localStorage.getItem(PROJECTS_KEY);
  if (!data) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(INITIAL_PROJECTS));
    return INITIAL_PROJECTS;
  }
  return JSON.parse(data);
}

export function saveLocalProjects(projects: Project[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function getLocalGoals(): SavingGoal[] {
  const data = localStorage.getItem(GOALS_KEY);
  if (!data) {
    localStorage.setItem(GOALS_KEY, JSON.stringify(INITIAL_GOALS));
    return INITIAL_GOALS;
  }
  return JSON.parse(data);
}

export function saveLocalGoals(goals: SavingGoal[]) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

export function getLocalFixedExpenses(): FixedExpense[] {
  const data = localStorage.getItem(FIXED_EXPENSES_KEY);
  if (!data) {
    localStorage.setItem(FIXED_EXPENSES_KEY, JSON.stringify([]));
    return [];
  }
  return JSON.parse(data);
}

export function saveLocalFixedExpenses(expenses: FixedExpense[]) {
  localStorage.setItem(FIXED_EXPENSES_KEY, JSON.stringify(expenses));
}

export function getLocalShoppingGroups(): ShoppingGroup[] {
  try {
    const data = localStorage.getItem(SHOPPING_GROUPS_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalShoppingGroups(groups: ShoppingGroup[]) {
  localStorage.setItem(SHOPPING_GROUPS_KEY, JSON.stringify(groups));
}

export function getSyncConfig(): SyncConfig {
  const data = localStorage.getItem(SYNC_CONFIG_KEY);
  if (!data) {
    const defaultConfig: SyncConfig = {
      syncMode: 'script',
      appsScriptUrl: 'https://script.google.com/macros/s/AKfycbz1srNSO-Gp499ileoZ3h1LUOhj9SQxtCCPokaFqxdVknj-Smf_JcTmEDlMcqJ9svqR/exec',
      isConnected: true,
    };
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(defaultConfig));
    return defaultConfig;
  }
  const parsed = JSON.parse(data);
  if (!parsed.appsScriptUrl) {
    parsed.appsScriptUrl = 'https://script.google.com/macros/s/AKfycbz1srNSO-Gp499ileoZ3h1LUOhj9SQxtCCPokaFqxdVknj-Smf_JcTmEDlMcqJ9svqR/exec';
    parsed.syncMode = 'script';
    parsed.isConnected = true;
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(parsed));
  }
  return parsed;
}

export function saveSyncConfig(config: SyncConfig) {
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
}

export function getSyncLogs(): SyncLogEntry[] {
  const data = localStorage.getItem(SYNC_LOGS_KEY);
  return data ? JSON.parse(data) : [];
}

export function addSyncLog(action: string, status: 'success' | 'pending' | 'error', details: string) {
  const logs = getSyncLogs();
  const newLog: SyncLogEntry = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    timestamp: new Date().toISOString(),
    action,
    status,
    details,
  };
  localStorage.setItem(SYNC_LOGS_KEY, JSON.stringify([newLog, ...logs].slice(0, 50)));
  return newLog;
}

export function clearSyncLogs() {
  localStorage.setItem(SYNC_LOGS_KEY, JSON.stringify([]));
}

export function getOfflineQueue(): any[] {
  const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
  return data ? JSON.parse(data) : [];
}

export function addToOfflineQueue(action: string, payload: any) {
  const queue = getOfflineQueue();
  queue.push({
    id: 'q_' + Date.now(),
    timestamp: new Date().toISOString(),
    action,
    payload,
  });
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  addSyncLog('Queue Offline', 'pending', `Acción agregada a la cola diferida: ${action}`);
}

export function clearOfflineQueue() {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify([]));
}

// Generate Google Apps Script backend template
export function generateAppsScriptCode(): string {
  return `/**
 * GOOGLE APPS SCRIPT BACKEND
 * Finanzas y Proyectos - Sistema Operativo Financiero
 * 
 * Instrucciones:
 * 1. Crea una hoja de cálculo en Google Sheets.
 * 2. Ve a Extensiones > Apps Script.
 * 3. Borra el código existente y pega este bloque completo.
 * 4. Guarda con el icono de disco.
 * 5. Haz clic en "Implementar" > "Nueva implementación".
 * 6. Selecciona tipo "Aplicación web".
 * 7. En "Quién tiene acceso", selecciona "Cualquiera" (Any).
 * 8. Implementa, autoriza los accesos e introduce el URL de la App Web en la aplicación.
 */

const SPREADSHEET_ID = ""; // Opcional: Si dejas vacío se usa la hoja activa contenedora.

function getSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

// Inicializa las pestañas si no existen
function setupDatabase() {
  const ss = getSpreadsheet();
  const sheets = {
    "Cuentas": ["ID", "Nombre", "Tipo", "SaldoInicial", "SaldoActual", "Divisa"],
    "Movimientos": ["ID", "Fecha", "Tipo", "CuentaOrigen", "CuentaDestino", "Categoria", "Subcategoria", "Monto", "Descripcion", "Etiquetas", "DetalleProductos"],
    "Categorias": ["ID", "Nombre", "Tipo", "Icono"],
    "Proyectos": ["ID", "Nombre", "Descripcion", "Estado", "FechaObjetivo", "Prioridad", "CuentasAsociadas", "Notas"],
    "PresupuestosProyecto": ["ProyectoID", "ID", "Nombre", "Estimado", "Real", "Estado"],
    "TareasProyecto": ["ProyectoID", "ID", "Nombre", "Completada", "Categoria", "Descripcion", "Vencimiento", "Monto", "EnlacePago", "EsPago"],
    "Metas": ["ID", "Nombre", "MontoObjetivo", "MontoAcumulado", "FechaObjetivo"],
    "GastosFijos": ["ID", "Nombre", "Grupo", "Subgrupo", "Monto", "Divisa", "DiaVencimiento", "Descripcion", "EnlacePago", "UltimoMesPagado"],
    "ListasCompras": ["ID", "Nombre", "Fecha", "Urgencia", "EnlaceGeneral", "Ubicacion"],
    "ItemsCompra": ["ListasComprasID", "ID", "Nombre", "Cantidad", "Precio", "Completado", "EnlaceProducto", "Tienda"],
    "Prestamos": ["ID", "Tipo", "Persona", "Monto", "Divisa", "Interes", "FechaInicio", "Vencimiento", "Estado", "CuentaAsociadaID", "CuentaAsociadaNombre", "Descripcion"],
    "AbonosPrestamos": ["PrestamoID", "ID", "Fecha", "Monto", "CuentaAsociadaID", "CuentaAsociadaNombre"]
  };
  
  for (let name in sheets) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(sheets[name]);
      // Aplicar formato de cabecera elegante
      sheet.getRange(1, 1, 1, sheets[name].length)
        .setBackground("#111827")
        .setFontColor("#FFFFFF")
        .setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  }
  return "Database setup complete! sheets created successfully.";
}

// Handler de peticiones GET para lectura de datos o carga de la interfaz HTML
function doGet(e) {
  try {
    const ss = getSpreadsheet();
    setupDatabase();
    
    const action = e.parameter.action;
    
    if (action === "test") {
      return ContentService.createTextOutput(JSON.stringify({ status: "ok", message: "Conexión exitosa con Apps Script" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "api") {
      const responseData = {
        accounts: getSheetData(ss, "Cuentas"),
        transactions: getSheetData(ss, "Movimientos"),
        categories: getSheetData(ss, "Categorias"),
        projects: getProjectsWithSubData(ss),
        goals: getSheetData(ss, "Metas"),
        fixedExpenses: getSheetData(ss, "GastosFijos"),
        shoppingGroups: getShoppingGroupsWithItems(ss),
        loans: getLoansWithSubData(ss)
      };
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: responseData }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Servir la interfaz del index.html en Apps Script Web App
    return HtmlService.createTemplateFromFile("Index")
      .evaluate()
      .setTitle("Finanzas y Proyectos")
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag("viewport", "width=device-width, initial-scale=1");
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handler de peticiones POST para escritura de datos externa
function doPost(e) {
  try {
    const ss = getSpreadsheet();
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    
    if (action === "sync_all") {
      writeSheetData(ss, "Cuentas", postData.accounts, ["id", "name", "type", "initialBalance", "currentBalance", "currency"]);
      writeSheetData(ss, "Movimientos", postData.transactions, ["id", "date", "type", "originAccount", "destinationAccount", "category", "subcategory", "amount", "description", "tags", "items"]);
      writeSheetData(ss, "Categorias", postData.categories, ["id", "name", "type", "icon"]);
      writeSheetData(ss, "Metas", postData.goals, ["id", "name", "targetAmount", "accumulatedAmount", "targetDate"]);
      writeSheetData(ss, "GastosFijos", postData.fixedExpenses, ["id", "name", "group", "subgroup", "amount", "currency", "dueDay", "description", "paymentLink", "lastPaidMonth"]);
      writeShoppingGroupsData(ss, postData.shoppingGroups || []);
      writeProjectsData(ss, postData.projects);
      writeLoansData(ss, postData.loans || []);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Sincronización completa realizada con éxito." }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Acción no soportada" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Funciones expuestas para acceso directo google.script.run desde el iframe
function readDatabase() {
  const ss = getSpreadsheet();
  setupDatabase();
  const payload = {
    accounts: getSheetData(ss, "Cuentas"),
    transactions: getSheetData(ss, "Movimientos"),
    categories: getSheetData(ss, "Categorias"),
    projects: getProjectsWithSubData(ss),
    goals: getSheetData(ss, "Metas"),
    fixedExpenses: getSheetData(ss, "GastosFijos"),
    shoppingGroups: getShoppingGroupsWithItems(ss),
    loans: getLoansWithSubData(ss)
  };
  return JSON.stringify(payload);
}

function writeDatabase(payloadStr) {
  const ss = getSpreadsheet();
  const postData = JSON.parse(payloadStr);
  
  writeSheetData(ss, "Cuentas", postData.accounts, ["id", "name", "type", "initialBalance", "currentBalance", "currency"]);
  writeSheetData(ss, "Movimientos", postData.transactions, ["id", "date", "type", "originAccount", "destinationAccount", "category", "subcategory", "amount", "description", "tags", "items"]);
  writeSheetData(ss, "Categorias", postData.categories, ["id", "name", "type", "icon"]);
  writeSheetData(ss, "Metas", postData.goals, ["id", "name", "targetAmount", "accumulatedAmount", "targetDate"]);
  writeSheetData(ss, "GastosFijos", postData.fixedExpenses, ["id", "name", "group", "subgroup", "amount", "currency", "dueDay", "description", "paymentLink", "lastPaidMonth"]);
  writeShoppingGroupsData(ss, postData.shoppingGroups || []);
  writeProjectsData(ss, postData.projects);
  writeLoansData(ss, postData.loans || []);
  
  return "success";
}

// Helper para leer datos de una pestaña de forma genérica
function getSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  const headers = values[0];
  const items = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const item = {};
    for (let j = 0; j < headers.length; j++) {
      let val = row[j];
      // Manejar formato de fecha
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      // Parsear etiquetas separadas por comas o JSON de productos
      if (headers[j] === "Etiquetas" || headers[j] === "CuentasAsociadas") {
        val = val ? val.toString().split(",").map(s => s.trim()).filter(Boolean) : [];
      } else if (headers[j] === "DetalleProductos") {
        try {
          val = val ? JSON.parse(val.toString()) : [];
        } catch (e) {
          val = [];
        }
      } else if (headers[j] === "Completado" || headers[j] === "Completada" || headers[j] === "EsPago") {
        val = val === true || val === "true" || val === "TRUE" || val === 1 || val === "1";
      }
      
      // Mapear cabeceras en español de la hoja a claves en inglés del modelo
      let key = headers[j];
      if (key === "ID") key = "id";
      else if (key === "Completado" || key === "Completada") key = "completed";
      else if (key === "PrecioEstimado") key = "estimatedPrice";
      else if (key === "Cantidad") key = "quantity";
      else if (key === "DetalleProductos") key = "items";
      else if (key === "Nombre") key = "name";
      else if (key === "Tipo") key = "type";
      else if (key === "SaldoInicial") key = "initialBalance";
      else if (key === "SaldoActual") key = "currentBalance";
      else if (key === "Divisa") key = "currency";
      else if (key === "Fecha") key = "date";
      else if (key === "CuentaOrigen") key = "originAccount";
      else if (key === "CuentaDestino") key = "destinationAccount";
      else if (key === "Categoria") key = "category";
      else if (key === "Subcategoria") key = "subcategory";
      else if (key === "Monto") key = "amount";
      else if (key === "Descripcion") key = "description";
      else if (key === "Icono") key = "icon";
      else if (key === "MontoObjetivo") key = "targetAmount";
      else if (key === "MontoAcumulado") key = "accumulatedAmount";
      else if (key === "FechaObjetivo") key = "targetDate";
      else if (key === "CuentasAsociadas") key = "allocatedAccountIds";
      else if (key === "Notas") key = "notes";
      else if (key === "ProyectoID") key = "projectId";
      else if (key === "Estimado") key = "estimatedAmount";
      else if (key === "Real") key = "realAmount";
      else if (key === "Estado") key = "status";
      else if (key === "Completada") key = "completed";
      else if (key === "Vencimiento") key = "dueDate";
      else if (key === "EnlacePago") key = "paymentLink";
      else if (key === "EsPago") key = "isPayment";
      else if (key === "Grupo") key = "group";
      else if (key === "Subgrupo") key = "subgroup";
      else if (key === "DiaVencimiento") key = "dueDay";
      else if (key === "UltimoMesPagado") key = "lastPaidMonth";
      else if (key === "PrestamoID") key = "loanId";
      else if (key === "CuentaAsociadaID") key = "accountId";
      else if (key === "CuentaAsociadaNombre") key = "accountName";
      else if (key === "FechaInicio") key = "startDate";
      else if (key === "Interes") key = "interestRate";
      else if (key === "Estado") key = "status";
      else if (key === "Persona") key = "person";
      else if (key === "EnlaceGeneral") key = "url";
      else if (key === "Ubicacion") key = "storeLocation";
      else if (key === "Urgencia") key = "urgency";
      else if (key === "ListasComprasID") key = "groupId";
      else if (key === "Precio") key = "estimatedPrice";
      else if (key === "EnlaceProducto") key = "url";
      else if (key === "Tienda") key = "store";
      
      item[key] = val;
    }
    items.push(item);
  }
  return items;
}

// Obtener proyectos consolidados con presupuesto y tareas
function getProjectsWithSubData(ss) {
  const projects = getSheetData(ss, "Proyectos");
  const budgetItems = getSheetData(ss, "PresupuestosProyecto");
  const tasks = getSheetData(ss, "TareasProyecto");
  
  return projects.map(proj => {
    proj.budgetItems = budgetItems.filter(item => item.projectId === proj.id);
    proj.tasks = tasks.map(task => {
      task.completed = task.completed === "TRUE" || task.completed === true || task.completed === "true";
      task.isPayment = task.isPayment === "TRUE" || task.isPayment === true || task.isPayment === "true";
      task.amount = parseFloat(task.amount) || 0;
      return task;
    }).filter(task => task.projectId === proj.id);
    proj.files = []; // El local almacena simulaciones
    proj.calendarEvents = [];
    return proj;
  });
}

// Escribir datos de forma estructurada en las hojas
function writeSheetData(ss, sheetName, data, fieldsInOrder) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clearContents();
  }
  
  // Re-append cabeceras mapeadas al español
  const spanishHeaders = fieldsInOrder.map(f => {
    if (f === "id") return "ID";
    if (f === "name") return "Nombre";
    if (f === "type") return "Tipo";
    if (f === "initialBalance") return "SaldoInicial";
    if (f === "currentBalance") return "SaldoActual";
    if (f === "currency") return "Divisa";
    if (f === "date") return "Fecha";
    if (f === "originAccount") return "CuentaOrigen";
    if (f === "destinationAccount") return "CuentaDestino";
    if (f === "category") return "Categoria";
    if (f === "subcategory") return "Subcategoria";
    if (f === "amount") return "Monto";
    if (f === "description") return "Descripcion";
    if (f === "tags") return "Etiquetas";
    if (f === "items") return "DetalleProductos";
    if (f === "icon") return "Icono";
    if (f === "targetAmount") return "MontoObjetivo";
    if (f === "accumulatedAmount") return "MontoAcumulado";
    if (f === "targetDate") return "FechaObjetivo";
    if (f === "allocatedAccountIds") return "CuentasAsociadas";
    if (f === "notes") return "Notas";
    if (f === "group") return "Grupo";
    if (f === "subgroup") return "Subgrupo";
    if (f === "dueDay") return "DiaVencimiento";
    if (f === "lastPaidMonth") return "UltimoMesPagado";
    if (f === "dueDate") return "Vencimiento";
    if (f === "isPayment") return "EsPago";
    if (f === "paymentLink") return "EnlacePago";
    if (f === "completed") return sheetName === "TareasProyecto" ? "Completada" : "Completado";
    if (f === "estimatedPrice") return "PrecioEstimado";
    if (f === "quantity") return "Cantidad";
    if (f === "person") return "Persona";
    if (f === "interestRate") return "Interes";
    if (f === "startDate") return "FechaInicio";
    if (f === "loanId") return "PrestamoID";
    if (f === "accountId") return "CuentaAsociadaID";
    if (f === "accountName") return "CuentaAsociadaNombre";
    if (f === "groupId") return "ListasComprasID";
    if (f === "estimatedPrice") return "Precio";
    if (f === "urgency") return "Urgencia";
    if (f === "storeLocation") return "Ubicacion";
    if (f === "store") return "Tienda";
    if (f === "url") return sheetName === "ListasCompras" ? "EnlaceGeneral" : "EnlaceProducto";
    return f;
  });
  
  sheet.appendRow(spanishHeaders);
  sheet.getRange(1, 1, 1, spanishHeaders.length)
    .setBackground("#111827")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold");
    
  if (!data || data.length === 0) return;
  
  const rows = data.map(item => {
    return fieldsInOrder.map(field => {
      let val = item[field];
      if (field === "items") {
        return val ? JSON.stringify(val) : "";
      }
      if (Array.isArray(val)) {
        return val.join(", ");
      }
      return val === undefined || val === null ? "" : val;
    });
  });
  
  sheet.getRange(2, 1, rows.length, fieldsInOrder.length).setValues(rows);
}

// Guardar proyectos y sus relaciones
function writeProjectsData(ss, projects) {
  writeSheetData(ss, "Proyectos", projects, ["id", "name", "description", "status", "targetDate", "priority", "allocatedAccountIds", "notes"]);
  
  // Consolidar todos los ítems de presupuesto y tareas de todos los proyectos
  const allBudgetItems = [];
  const allTasks = [];
  
  projects.forEach(proj => {
    if (proj.budgetItems) {
      proj.budgetItems.forEach(item => {
        allBudgetItems.push({
          projectId: proj.id,
          id: item.id,
          name: item.name,
          estimatedAmount: item.estimatedAmount,
          realAmount: item.realAmount,
          status: item.status
        });
      });
    }
    
    if (proj.tasks) {
      proj.tasks.forEach(task => {
        allTasks.push({
          projectId: proj.id,
          id: task.id,
          name: task.name,
          completed: task.completed,
          category: task.category || "",
          description: task.description || "",
          dueDate: task.dueDate || "",
          amount: task.amount || 0,
          paymentLink: task.paymentLink || "",
          isPayment: task.isPayment || false
        });
      });
    }
  });
  
  writeSheetData(ss, "PresupuestosProyecto", allBudgetItems, ["projectId", "id", "name", "estimatedAmount", "realAmount", "status"]);
  writeSheetData(ss, "TareasProyecto", allTasks, ["projectId", "id", "name", "completed", "category", "description", "dueDate", "amount", "paymentLink", "isPayment"]);
}

function getLoansWithSubData(ss) {
  const loans = getSheetData(ss, "Prestamos");
  const payments = getSheetData(ss, "AbonosPrestamos");
  
  return loans.map(loan => {
    loan.interestRate = parseFloat(loan.interestRate) || 0;
    loan.amount = parseFloat(loan.amount) || 0;
    loan.payments = payments.map(p => {
      p.amount = parseFloat(p.amount) || 0;
      return p;
    }).filter(p => p.loanId === loan.id || p.projectId === loan.id);
    return loan;
  });
}

function writeLoansData(ss, loans) {
  writeSheetData(ss, "Prestamos", loans, ["id", "type", "person", "amount", "currency", "interestRate", "startDate", "dueDate", "status", "accountId", "accountName", "description"]);
  
  const allPayments = [];
  loans.forEach(loan => {
    if (loan.payments) {
      loan.payments.forEach(p => {
        allPayments.push({
          loanId: loan.id,
          id: p.id,
          date: p.date,
          amount: p.amount,
          accountId: p.accountId,
          accountName: p.accountName
        });
      });
    }
  });
  
  writeSheetData(ss, "AbonosPrestamos", allPayments, ["loanId", "id", "date", "amount", "accountId", "accountName"]);
}

function getShoppingGroupsWithItems(ss) {
  const groups = getSheetData(ss, "ListasCompras");
  const items = getSheetData(ss, "ItemsCompra");
  
  return groups.map(g => {
    g.items = items.map(it => {
      it.completed = it.completed === true || it.completed === "true" || it.completed === "TRUE";
      it.quantity = parseInt(it.quantity) || 1;
      it.estimatedPrice = parseFloat(it.estimatedPrice) || 0;
      return it;
    }).filter(it => it.groupId === g.id);
    return g;
  });
}

function writeShoppingGroupsData(ss, groups) {
  writeSheetData(ss, "ListasCompras", groups, ["id", "name", "date", "urgency", "url", "storeLocation"]);
  
  const allItems = [];
  groups.forEach(group => {
    if (group.items) {
      group.items.forEach(item => {
        allItems.push({
          groupId: group.id,
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          estimatedPrice: item.estimatedPrice,
          completed: item.completed,
          url: item.url || "",
          store: item.store || ""
        });
      });
    }
  });
  writeSheetData(ss, "ItemsCompra", allItems, ["groupId", "id", "name", "quantity", "estimatedPrice", "completed", "url", "store"]);
}

`;
}

// Local Sync Simulator to provide an incredibly detailed experience
export async function runSimulatedSync(
  accounts: Account[],
  transactions: Transaction[],
  categories: Category[],
  projects: Project[],
  goals: SavingGoal[],
  fixedExpenses: FixedExpense[],
  loans: Loan[] = [],
  shoppingGroups: ShoppingGroup[] = [],
  pantry: PantryItem[] = []
): Promise<{ success: boolean; message: string }> {
  // Let's make an artificial delay of 1.5s to feel realistic
  await new Promise((resolve) => setTimeout(resolve, 1500));

  try {
    // Save to local storage to persist
    saveLocalAccounts(accounts);
    saveLocalTransactions(transactions);
    saveLocalCategories(categories);
    saveLocalProjects(projects);
    saveLocalGoals(goals);
    saveLocalFixedExpenses(fixedExpenses);
    saveLocalLoans(loans);
    saveLocalShoppingGroups(shoppingGroups);
    saveLocalPantry(pantry);

    const now = new Date().toLocaleString();
    const logDetails = `Sincronizados localmente: ${accounts.length} Cuentas, ${transactions.length} Movimientos, ${projects.length} Proyectos, ${goals.length} Metas, ${fixedExpenses.length} Gastos Fijos, ${loans.length} Préstamos, ${shoppingGroups.length} Carpetas de Compras, ${pantry.length} Insumos de Despensa.`;
    addSyncLog('Sincronización Completa', 'success', logDetails);

    // Update config
    const config = getSyncConfig();
    config.lastSync = now;
    saveSyncConfig(config);

    return {
      success: true,
      message: 'Sincronización simulada completada con éxito. Google Sheets ha sido actualizado virtualmente.',
    };
  } catch (error: any) {
    addSyncLog('Sincronización Fallida', 'error', error.message || 'Error desconocido');
    return {
      success: false,
      message: `Error al sincronizar: ${error.message || 'Error en guardado'}`,
    };
  }
}

// Action triggers to update accounts when movements are modified/created
export function recalculateAccountBalances(accounts: Account[], transactions: Transaction[]): Account[] {
  // Reset accounts to their initial balance and reapply all transactions
  const recalculated = accounts.map(acc => ({
    ...acc,
    currentBalance: acc.initialBalance
  }));

  // Sort transactions by date (older to newer) to reconstruct balance history if needed
  transactions.forEach(t => {
    if (t.type === 'Ingreso') {
      const acc = recalculated.find(a => a.name === t.originAccount || a.id === t.originAccount);
      if (acc) {
        acc.currentBalance += t.amount;
      }
    } else if (t.type === 'Gasto') {
      const acc = recalculated.find(a => a.name === t.originAccount || a.id === t.originAccount);
      if (acc) {
        acc.currentBalance -= t.amount;
      }
    } else if (t.type === 'Transferencia' && t.destinationAccount) {
      const origin = recalculated.find(a => a.name === t.originAccount || a.id === t.originAccount);
      const dest = recalculated.find(a => a.name === t.destinationAccount || a.id === t.destinationAccount);
      if (origin) origin.currentBalance -= t.amount;
      if (dest) dest.currentBalance += t.amount;
    }
  });

  return recalculated;
}

// Fetch exchange rates from public APIs (Fallback enabled)
export async function fetchLiveExchangeRates(): Promise<{
  ARS_USD_BLUE: number;
  ARS_USDT: number;
  USD_BTC: number;
  lastUpdated?: string;
}> {
  const rates = {
    ARS_USD_BLUE: 1220,
    ARS_USDT: 1240,
    USD_BTC: 62000,
    lastUpdated: new Date().toLocaleTimeString()
  };
  
  try {
    // 1. Dolar Blue de Bluelytics
    const res = await fetch('https://api.bluelytics.com.ar/v2/latest');
    if (res.ok) {
      const data = await res.json();
      if (data && data.blue && data.blue.value_sell) {
        rates.ARS_USD_BLUE = Number(data.blue.value_sell);
      }
    }
  } catch (e) {
    console.warn('Error fetching Bluelytics:', e);
  }

  try {
    // 2. BTC de Binance
    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    if (res.ok) {
      const data = await res.json();
      if (data && data.price) {
        rates.USD_BTC = Math.round(Number(data.price));
      }
    }
  } catch (e) {
    console.warn('Error fetching Binance BTC:', e);
  }

  try {
    // 3. USDT de Criptoya
    const res = await fetch('https://criptoya.com/api/binance/usdt/ars');
    if (res.ok) {
      const data = await res.json();
      if (data && data.ask) {
        rates.ARS_USDT = Math.round(Number(data.ask));
      }
    } else {
      rates.ARS_USDT = Math.round(rates.ARS_USD_BLUE * 1.02);
    }
  } catch (e) {
    console.warn('Error fetching Criptoya:', e);
    rates.ARS_USDT = Math.round(rates.ARS_USD_BLUE * 1.02);
  }

  rates.lastUpdated = new Date().toLocaleTimeString();
  return rates;
}
