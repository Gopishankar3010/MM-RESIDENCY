import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));

// Persistent server data directory
const DATA_DIR = path.join(__dirname, 'server-data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create server-data directory:', err);
  }
}

// In-memory state cache backed by persistent file
let cachedState: any = null;
if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    cachedState = JSON.parse(raw);
    console.log(`[Store] Loaded persistent state with ${cachedState?.dailySales?.length || 0} sales reports, ${cachedState?.requests?.length || 0} requests.`);
  } catch (err) {
    console.error('[Store] Failed to read initial store.json:', err);
  }
}

// Enable CORS for API routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// GET /api/state - Return synchronized state to any device
app.get('/api/state', (req, res) => {
  if (cachedState) {
    return res.json({
      success: true,
      data: cachedState,
      serverTime: new Date().toISOString(),
      version: cachedState._version || 1
    });
  }
  return res.json({
    success: true,
    data: null,
    serverTime: new Date().toISOString(),
    version: 0
  });
});

// POST /api/state - Save updated state from any device and persist to disk
app.post('/api/state', (req, res) => {
  try {
    const incoming = req.body;
    if (!incoming || typeof incoming !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid state payload' });
    }

    const version = (cachedState?._version || 0) + 1;
    const updatedAt = new Date().toISOString();

    cachedState = {
      ...incoming,
      _version: version,
      updatedAt
    };

    // Asynchronously write to disk
    fs.writeFile(DATA_FILE, JSON.stringify(cachedState, null, 2), 'utf-8', (err) => {
      if (err) {
        console.error('[Store] Error persisting state to file:', err);
      }
    });

    return res.json({
      success: true,
      version,
      updatedAt
    });
  } catch (err: any) {
    console.error('[Store] POST /api/state error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    serverTime: new Date().toISOString(),
    hasData: !!cachedState
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Development mode: Vite middleware attached to Express
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true'
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built bundle from dist/
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MM Residency] Server started on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer();
