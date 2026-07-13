/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Iniciando Compilación para Google Sheets (GAS Bundler - ESM) ---');

try {
  // 1. Ejecutar el build de Vite
  console.log('Ejecutando npm run build...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('Build completado con éxito.');

  // 2. Definir rutas
  const distDir = path.join(__dirname, '..', 'dist');
  const assetsDir = path.join(distDir, 'assets');
  const indexHtmlPath = path.join(distDir, 'index.html');
  const outputHtmlPath = path.join(distDir, 'Index.html');

  if (!fs.existsSync(indexHtmlPath)) {
    throw new Error('No se encontró el archivo dist/index.html resultante de la compilación.');
  }

  let htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

  // Inyectar el icono de la app en formato Base64 para iOS y Favicon
  const iconPath = path.join(__dirname, '..', 'public', 'app-icon.png');
  let iconBase64 = '';
  if (fs.existsSync(iconPath)) {
    console.log('Inyectando icono de la app en formato Base64 para PWA...');
    iconBase64 = fs.readFileSync(iconPath).toString('base64');
    const dataUri = `data:image/png;base64,${iconBase64}`;
    
    // Reemplazar apple-touch-icon href
    htmlContent = htmlContent.replace(/href=["']\/app-icon\.png["']/g, `href="${dataUri}"`);
    // Reemplazar favicon href para usar el mismo logo premium en el navegador
    htmlContent = htmlContent.replace(/href=["']\/favicon\.svg["']/g, `href="${dataUri}"`);
  }

  // Inyectar manifest.json en formato Base64 auto-contenido
  const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
  if (fs.existsSync(manifestPath) && iconBase64) {
    console.log('Inyectando manifest.json en formato Base64 para PWA...');
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      manifest.icons = [
        {
          src: `data:image/png;base64,${iconBase64}`,
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: `data:image/png;base64,${iconBase64}`,
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ];
      const manifestBase64 = Buffer.from(JSON.stringify(manifest)).toString('base64');
      htmlContent = htmlContent.replace(/href=["']\/manifest\.json["']/g, `href="data:application/manifest+json;base64,${manifestBase64}"`);
    } catch (e) {
      console.error('Error al inyectar manifest:', e);
    }
  }

  // 3. Encontrar e inyectar archivos CSS
  const cssMatches = [...htmlContent.matchAll(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']\/assets\/([^"']+\.css)["'][^>]*>/g)];
  for (const match of cssMatches) {
    const linkTag = match[0];
    const cssFileName = match[1];
    const cssPath = path.join(assetsDir, cssFileName);
    
    if (fs.existsSync(cssPath)) {
      console.log(`Inyectando CSS en línea: ${cssFileName}`);
      const cssContent = fs.readFileSync(cssPath, 'utf8');
      htmlContent = htmlContent.replace(linkTag, () => `<style>${cssContent}</style>`);
    } else {
      console.warn(`Advertencia: No se encontró el archivo CSS en ${cssPath}`);
    }
  }

  // 4. Encontrar e inyectar archivos JS (Vite empaqueta típicamente en un solo script principal)
  // Removemos el script tag de la cabecera (<head>) e inyectamos el código al final del body (</body>)
  // para asegurar que el DOM (#root) esté completamente creado antes de que React intente renderizar.
  const jsMatches = [...htmlContent.matchAll(/<script[^>]*src=["']\/assets\/([^"']+\.js)["'][^>]*><\/script>/g)];
  for (const match of jsMatches) {
    const scriptTag = match[0];
    const jsFileName = match[1];
    const jsPath = path.join(assetsDir, jsFileName);
    
    if (fs.existsSync(jsPath)) {
      console.log(`Inyectando JS al final del body: ${jsFileName}`);
      let jsContent = fs.readFileSync(jsPath, 'utf8');
      
      // Escapar secuencias de cierre de etiquetas
      jsContent = jsContent.replace(/<\/script>/g, '<\\/script>');
      
      // Remover de su ubicación original en <head>
      htmlContent = htmlContent.replace(scriptTag, '');
      
      // Inyectar antes del cierre de </body>
      htmlContent = htmlContent.replace('</body>', () => `<script type="text/javascript">${jsContent}</script></body>`);
    } else {
      console.warn(`Advertencia: No se encontró el archivo JS en ${jsPath}`);
    }
  }

  // 5. Guardar el archivo Index.html unificado
  fs.writeFileSync(outputHtmlPath, htmlContent, 'utf8');
  console.log(`--- Éxito: Archivo unificado generado en: ${outputHtmlPath} ---`);
  
  // Guardar también una copia en el directorio de artifacts para conveniencia
  const artifactDest = 'C:\\Users\\Juan\\.gemini\\antigravity\\brain\\e5276dd0-59d7-4d41-800a-76141bce4e86\\Index.html';
  fs.copyFileSync(outputHtmlPath, artifactDest);
  console.log(`Copia para descarga copiada en: ${artifactDest}`);

  // 6. Empaquetar activos PWA para el Escritorio (Netlify)
  const desktopAppDir = 'C:\\Users\\Juan\\Desktop\\Finanzas App';
  console.log(`Empaquetando activos PWA en: ${desktopAppDir}`);
  if (!fs.existsSync(desktopAppDir)) {
    fs.mkdirSync(desktopAppDir, { recursive: true });
  }

  // Guardar HTML unificado como index.html (minúscula para Netlify)
  fs.writeFileSync(path.join(desktopAppDir, 'index.html'), htmlContent, 'utf8');
  
  // Copiar sw.js
  const swSrc = path.join(__dirname, '..', 'public', 'sw.js');
  if (fs.existsSync(swSrc)) {
    fs.copyFileSync(swSrc, path.join(desktopAppDir, 'sw.js'));
  }
  
  // Guardar manifest.json actualizado
  if (fs.existsSync(manifestPath) && iconBase64) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      manifest.icons = [
        {
          src: `data:image/png;base64,${iconBase64}`,
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: `data:image/png;base64,${iconBase64}`,
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ];
      fs.writeFileSync(path.join(desktopAppDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    } catch (err) {
      console.error(err);
    }
  }

  // Copiar app-icon.png
  if (fs.existsSync(iconPath)) {
    fs.copyFileSync(iconPath, path.join(desktopAppDir, 'app-icon.png'));
  }
  
  // Copiar Codigo.gs para actualizar Apps Script
  const codigoSrc = 'C:\\Users\\Juan\\.gemini\\antigravity\\brain\\e5276dd0-59d7-4d41-800a-76141bce4e86\\Codigo.gs';
  if (fs.existsSync(codigoSrc)) {
    fs.copyFileSync(codigoSrc, path.join(desktopAppDir, 'Codigo.gs'));
  }
  
  console.log('Empaquetado PWA en Escritorio completado.');

} catch (error) {
  console.error('Error durante la compilación unificada:', error);
  process.exit(1);
}
