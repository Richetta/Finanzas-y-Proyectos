/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Database, RefreshCw, Copy, Check, FileText, ChevronRight, 
  HelpCircle, AlertCircle, Play, Sparkles, Terminal, CheckCircle2,
  Smartphone, Camera
} from 'lucide-react';
import { SyncConfig, SyncLogEntry } from '../types';
import { generateAppsScriptCode, clearSyncLogs } from '../lib/sheetsSync';

interface SheetsIntegrationPanelProps {
  syncConfig: SyncConfig;
  syncLogs: SyncLogEntry[];
  onUpdateConfig: (cfg: SyncConfig) => void;
  onTriggerSync: () => Promise<void>;
  onClearLogs: () => void;
}

export function SheetsIntegrationPanel({
  syncConfig,
  syncLogs,
  onUpdateConfig,
  onTriggerSync,
  onClearLogs,
}: SheetsIntegrationPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' });

  // Local state inputs for URLs
  const [scriptUrl, setScriptUrl] = useState(syncConfig.appsScriptUrl || '');
  const [syncMode, setSyncMode] = useState<SyncConfig['syncMode']>(syncConfig.syncMode);

  const handleCopyCode = () => {
    const code = generateAppsScriptCode();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...syncConfig,
      syncMode,
      appsScriptUrl: scriptUrl,
      isConnected: syncMode === 'script' ? !!scriptUrl : syncConfig.isConnected,
    });
    alert('Configuración guardada de manera exitosa en el almacenamiento local de tu iPhone/PC.');
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await onTriggerSync();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestScriptUrl = async () => {
    if (!scriptUrl) {
      setTestResult({ status: 'error', message: 'Por favor ingrese una URL válida antes de testear.' });
      return;
    }
    setTestResult({ status: 'idle', message: 'Conectando...' });
    try {
      // JSONP or standard CORS fetch to GAS web app with action=test
      const testUrl = `${scriptUrl}?action=test`;
      const res = await fetch(testUrl);
      const data = await res.json();
      if (data && data.status === 'ok') {
        setTestResult({ status: 'success', message: '¡Conexión Exitosa! El Apps Script responde correctamente.' });
      } else {
        setTestResult({ status: 'error', message: 'Respuesta inválida del servidor script. Asegúrate de configurar la app web para acceso "Cualquiera" (Any).' });
      }
    } catch (err: any) {
      setTestResult({ 
        status: 'error', 
        message: 'Error de Red / CORS. Google Apps Script requiere que la petición sea HTTPS y configurada correctamente. La sincronización igualmente funcionará enviando los datos en POST.' 
      });
    }
  };

  return (
    <div className="space-y-6" id="integration-panel-container">
      {/* Explicación de la Arquitectura */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-xs" id="architecture-intro">
        <div className="flex items-start space-x-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl mt-0.5">
            <Database size={22} />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-black text-neutral-900">Sincronización Bidireccional de Google Sheets</h3>
            <p className="text-sm text-neutral-500 leading-relaxed">
              La aplicación está diseñada bajo el principio de <span className="font-extrabold text-neutral-700">Offline-First / Local-First</span>. 
              Todas tus cargas, modificaciones de cuentas y proyectos se guardan instantáneamente en tu iPhone. 
              Luego, se sincronizan de manera asíncrona hacia tu Google Sheets para mantener tu planilla respaldada y funcional.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="integration-setup-grid">
        {/* Lado 1: Formulario de Configuración de Enlace */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm space-y-6" id="form-integration-side">
          <div>
            <h4 className="text-sm font-bold text-neutral-800 flex items-center space-x-2">
              <Sparkles size={16} className="text-indigo-500" />
              <span>Conectar Base de Datos Externa</span>
            </h4>
            <p className="text-[11px] text-neutral-400 mt-0.5">Configura cómo deseas resguardar y sincronizar tus datos.</p>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            {/* Modo de Sincronización */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">Modo de sincronización</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setSyncMode('local')}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all ${syncMode === 'local' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500'}`}
                >
                  Modo Local (Simulado)
                </button>
                <button
                  type="button"
                  onClick={() => setSyncMode('script')}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all ${syncMode === 'script' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500'}`}
                >
                  Apps Script Web App
                </button>
              </div>
            </div>

            {syncMode === 'script' ? (
              <div className="space-y-4" id="gas-url-inputs">
                {/* URL de Google Apps Script */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">URL del Apps Script desplegado</label>
                  <input
                    type="url"
                    required
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={scriptUrl}
                    onChange={e => setScriptUrl(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-semibold focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Botón para testear conexión */}
                <div className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-100 rounded-xl">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase">Probar URL</span>
                  <button
                    type="button"
                    onClick={handleTestScriptUrl}
                    className="text-[10px] font-black text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Testear API Web App
                  </button>
                </div>

                {testResult.status !== 'idle' && (
                  <div className={`p-3 rounded-xl border text-[11px] flex items-start space-x-1.5 ${testResult.status === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                    <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 text-xs text-emerald-800 space-y-1" id="local-mode-alert">
                <p className="font-bold">¡Modo offline simulación activo!</p>
                <p className="text-neutral-500">
                  En este modo, las sincronizaciones se guardarán de manera robusta en el localStorage de tu navegador. 
                  Ideal para probar todas las funciones, proyecciones e hilos del sistema operativo de manera inmediata.
                </p>
              </div>
            )}

            {/* Guardar Config */}
            <button
              type="submit"
              className="w-full py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
            >
              Guardar Configuración de Enlace
            </button>
          </form>

          {/* Botón Sincronizar Ahora */}
          <div className="border-t border-neutral-100 pt-6 space-y-3" id="manual-sync-section">
            <h4 className="text-xs font-bold text-neutral-700">Controles de Ejecución Manual</h4>
            <div className="flex space-x-2">
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-200 text-white rounded-xl font-extrabold text-xs transition-all flex items-center justify-center space-x-2 shadow-sm cursor-pointer"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Datos Ahora'}</span>
              </button>
              
              <button
                onClick={() => {
                  if (confirm('¿Limpiar historial de registros de la terminal de sincronización?')) {
                    onClearLogs();
                  }
                }}
                className="px-3 py-3 border border-neutral-200 text-neutral-500 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-all cursor-pointer"
                title="Limpiar Consola"
              >
                <Terminal size={14} />
              </button>
            </div>
            <p className="text-[10px] text-neutral-400 text-center">Última sincronización exitosa: <span className="font-bold text-neutral-600">{syncConfig.lastSync || 'Nunca'}</span></p>
          </div>
        </div>

        {/* Lado 2: Panel de Instrucciones y Código Apps Script */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm space-y-6" id="gas-instructions-side">
          <div>
            <h4 className="text-sm font-bold text-neutral-800 flex items-center space-x-2">
              <FileText size={16} className="text-indigo-500" />
              <span>Instrucciones de Despliegue de Apps Script</span>
            </h4>
            <p className="text-[11px] text-neutral-400 mt-0.5">Sigue estos simples pasos para alojar la aplicación entera en tu Google Drive.</p>
          </div>

          <div className="space-y-4 text-xs text-neutral-600" id="steps-gas">
            <div className="flex items-start space-x-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-neutral-900 text-white font-extrabold flex items-center justify-center text-[10px]">1</span>
              <p>Crea una planilla vacía en tu cuenta de <span className="font-semibold text-neutral-800">Google Drive</span> y ve a <span className="font-semibold text-neutral-800">Extensiones ➔ Apps Script</span>.</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-neutral-900 text-white font-extrabold flex items-center justify-center text-[10px]">2</span>
              <p>Copia el código backend de abajo y pégalo en el archivo <span className="font-semibold text-neutral-800">Código.gs</span> de tu editor Apps Script.</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-neutral-900 text-white font-extrabold flex items-center justify-center text-[10px]">3</span>
              <p>Crea un archivo nuevo haciendo clic en el botón **+** en el editor de Google, selecciona **HTML**, llámalo exactamente <span className="font-semibold text-neutral-800">Index</span> y pégale el contenido del archivo compilado.</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-neutral-900 text-white font-extrabold flex items-center justify-center text-[10px]">4</span>
              <p>Haz clic en <span className="font-semibold text-neutral-800">Implementar ➔ Nueva implementación</span> (Tipo Aplicación Web, Ejecutar como: "Tú", Acceso: "Cualquiera"). Abre esa URL desde tu celular para usarla desde cualquier parte del mundo.</p>
            </div>
          </div>

          {/* Código a copiar */}
          <div className="space-y-4 pt-4 border-t border-neutral-100" id="gas-code-copy-section">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                <span>Archivo 1: Código.gs</span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center space-x-1 text-indigo-500 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check size={12} className="text-emerald-500" />
                      <span className="text-emerald-500">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copiar Código</span>
                    </>
                  )}
                </button>
              </div>
              <div className="bg-neutral-950 text-neutral-300 font-mono text-[9px] p-4 rounded-2xl overflow-x-auto max-h-40 border border-neutral-800 select-all">
                <pre>{generateAppsScriptCode()}</pre>
              </div>
            </div>

            <div className="space-y-2 bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100/50">
              <h5 className="text-[10px] font-black text-indigo-800 uppercase tracking-widest">Archivo 2: Index.html (Interfaz Frontend)</h5>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                El compilador unificó toda la interfaz de tu app (React, HTML, CSS y JS) en un solo archivo.
                Copia su contenido abriendo el archivo resultante en tu computadora y pégalo completo en la pestaña HTML llamada `Index` del editor.
              </p>
              <div className="pt-2">
                <a 
                  href="file:///C:/Users/Juan/.gemini/antigravity/brain/e5276dd0-59d7-4d41-800a-76141bce4e86/Index.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 text-xs font-black text-indigo-700 bg-indigo-150 hover:bg-indigo-200 px-4 py-2.5 rounded-xl transition-all shadow-xs"
                >
                  <FileText size={13} />
                  <span>Abrir/Ver Index.html Compilado</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal de Logs de Sincronización */}
      <div className="bg-neutral-950 text-neutral-300 rounded-3xl p-6 border border-neutral-800 shadow-xl space-y-4" id="sync-terminal">
        <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
          <h4 className="text-xs font-bold text-neutral-400 flex items-center space-x-2 font-mono">
            <Terminal size={14} className="text-emerald-400 animate-pulse" />
            <span>Consola de Operaciones de Base de Datos (Terminal GAS)</span>
          </h4>
          <span className="text-[10px] font-mono text-neutral-500">Historial en tiempo real</span>
        </div>

        <div className="font-mono text-[10px] space-y-2 max-h-48 overflow-y-auto scrollbar-none" id="terminal-logs-list">
          {syncLogs.length === 0 ? (
            <p className="text-neutral-500 italic py-4 text-center">Inicia una sincronización manual o registra movimientos para visualizar logs.</p>
          ) : (
            syncLogs.map(log => (
              <div key={log.id} className="flex items-start space-x-2 py-0.5 border-b border-neutral-900/40">
                <span className="text-neutral-500 flex-shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span className={`font-extrabold flex-shrink-0 ${log.status === 'success' ? 'text-emerald-400' : log.status === 'pending' ? 'text-amber-400' : 'text-rose-400'}`}>
                  {log.status === 'success' ? 'SUCCESS' : log.status === 'pending' ? 'PENDING' : 'ERROR'}
                </span>
                <span className="text-neutral-400 flex-shrink-0">•</span>
                <span className="font-bold text-neutral-200">{log.action}:</span>
                <span className="text-neutral-400 break-words">{log.details}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Guía de Integración con iOS / Atajos de Apple */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm space-y-6" id="ios-shortcuts-card">
        <div className="flex items-start space-x-3">
          <div className="p-3 bg-neutral-150 text-neutral-800 rounded-2xl border border-neutral-200/40">
            <Smartphone size={22} className="text-neutral-900" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-neutral-800">Carga Ultra-Rápida con iOS (Shortcuts & Siri)</h4>
            <p className="text-[11px] text-neutral-400 mt-0.5">Reduce la fricción al salir de un negocio configurando atajos en tu iPhone.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-neutral-100 text-xs text-neutral-600">
          
          {/* Paso 1: PWA */}
          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="font-extrabold text-[10px] bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded uppercase">Paso 1</span>
              <h5 className="font-bold text-neutral-800 mt-1">Pantalla de Inicio (PWA)</h5>
              <p className="text-[11px] text-neutral-400">
                Abre la app en Safari, presiona el botón **Compartir ➔ Añadir a Pantalla de Inicio**. Se abrirá en pantalla completa sin barra de navegación.
              </p>
            </div>
          </div>

          {/* Paso 2: Botón de Acción / Widgets */}
          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="font-extrabold text-[10px] bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded uppercase">Paso 2</span>
              <h5 className="font-bold text-neutral-800 mt-1">Widgets y Botón Físico</h5>
              <p className="text-[11px] text-neutral-400">
                Crea un Atajo en la app **Shortcuts de iOS** que ejecute *"Abrir URL"*. Asócialo al **Botón de Acción** del iPhone o colócalo como **Widget en tu Lock Screen**.
              </p>
            </div>
            
            <div className="space-y-2 mt-4 pt-4 border-t border-neutral-200/50">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/?action=quick-add`);
                  alert('¡Enlace de Teclado Rápido copiado!');
                }}
                className="w-full py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Smartphone size={10} />
                <span>Copiar Link de Teclado Rápido</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/?action=scan`);
                  alert('¡Enlace de Escáner copiado!');
                }}
                className="w-full py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Camera size={10} />
                <span>Copiar Link de Escáner</span>
              </button>
            </div>
          </div>

          {/* Paso 3: Siri Dictado de Voz */}
          <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="font-extrabold text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase">Avanzado</span>
              <h5 className="font-bold text-neutral-800 mt-1">Oye Siri, registra mi gasto</h5>
              <p className="text-[11px] text-neutral-400">
                Crea un atajo que pida un número (monto) y llame en segundo plano (POST) a la URL de Google Sheets, registrando tu gasto por voz en 2 segundos sin abrir la app.
              </p>
            </div>
            
            <div className="mt-4 pt-4 border-t border-neutral-200/50">
              <button
                type="button"
                disabled={!syncConfig.appsScriptUrl}
                onClick={() => {
                  if (syncConfig.appsScriptUrl) {
                    navigator.clipboard.writeText(syncConfig.appsScriptUrl);
                    alert('¡URL del Apps Script copiada para el atajo de Siri!');
                  }
                }}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-200 text-white text-[10px] font-black rounded-lg transition-colors flex items-center justify-center space-x-1 cursor-pointer"
              >
                <CheckCircle2 size={10} />
                <span>{syncConfig.appsScriptUrl ? 'Copiar URL para POST de Siri' : 'Configura GAS para Siri'}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
