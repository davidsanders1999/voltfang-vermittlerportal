import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Lade Umgebungsvariablen aus .env (expliziter Pfad für Zuverlässigkeit)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export default defineConfig({
  // Verzeichnis für Test-Dateien
  testDir: './tests',
  
  // Parallele Ausführung deaktivieren für bessere Kontrolle
  fullyParallel: false,
  
  // Keine Wiederholungen bei fehlgeschlagenen Tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  
  // Nur ein Worker für sequenzielle Ausführung
  workers: 1,
  
  // Reporter-Konfiguration
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  
  // Globale Test-Einstellungen
  use: {
    // Base-URL für die Anwendung
    baseURL: 'http://localhost:3000',
    
    // Screenshots bei Fehlern
    screenshot: 'only-on-failure',
    
    // Trace bei Fehlern für Debugging
    trace: 'on-first-retry',
    
    // Viewport-Größe
    viewport: { width: 1280, height: 720 },
  },

  // Timeout-Einstellungen
  timeout: 60000, // 60 Sekunden pro Test
  expect: {
    timeout: 10000, // 10 Sekunden für Assertions
  },

  // Projekte/Browser-Konfiguration
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Dev-Server automatisch starten (optional)
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5173',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
});
