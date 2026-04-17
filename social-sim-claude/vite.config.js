import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.resolve(__dirname, 'social-sim.log');
const MAX_LOG_BYTES = 4 * 1024 * 1024; // 4 MB rolling cap

// Vite middleware that lets the browser POST /__log entries.
// Each entry is appended to ./social-sim.log AND mirrored to the dev server's
// stdout, so you (or Claude) can read the same logs from either place.
function logServerPlugin() {
  return {
    name: 'social-sim-log-server',
    configureServer(server) {
      // Reset / start a new session marker so multiple runs are separable.
      const sessionHeader =
        '\n' +
        '='.repeat(72) +
        `\n=== social-sim session started ${new Date().toISOString()} ===\n` +
        '='.repeat(72) +
        '\n';
      try {
        // Roll the file if it's too big.
        if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > MAX_LOG_BYTES) {
          fs.renameSync(LOG_FILE, LOG_FILE + '.1');
        }
        fs.appendFileSync(LOG_FILE, sessionHeader);
      } catch {
        // ignore — logging must never break the dev server
      }

      server.middlewares.use('/__log', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
          if (body.length > 64 * 1024) {
            // Reject oversized payloads
            req.destroy();
          }
        });
        req.on('end', () => {
          try {
            const entry = JSON.parse(body || '{}');
            const ts = entry.ts || new Date().toISOString();
            const level = (entry.level || 'info').toUpperCase().padEnd(5);
            const cat = (entry.category || 'app').padEnd(10);
            let line = `${ts} ${level} ${cat} ${entry.message || ''}`;
            if (entry.data !== undefined) {
              try {
                line += ' ' + JSON.stringify(entry.data);
              } catch {
                line += ' [unserializable data]';
              }
            }
            line += '\n';
            try {
              fs.appendFileSync(LOG_FILE, line);
            } catch {
              // ignore disk errors
            }
            // Also print to the dev server's terminal
            process.stdout.write(line);
          } catch {
            // bad payload — silently ignore
          }
          res.statusCode = 204;
          res.end();
        });
      });
    },
  };
}

export default defineConfig(({ command }) => ({
  // In prod the social-sim build is mounted under /sim/ inside the unified
  // Static Web App. In dev (`npm run dev`) Vite serves at the root.
  base: command === 'build' ? '/sim/' : '/',
  server: {
    port: 5173,
    open: true,
    // Forward /api/* to the local Azure Functions runtime so `npm run dev`
    // works alongside `func start` (or just use `swa start` to run both).
    proxy: {
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  plugins: [logServerPlugin()],
}));
