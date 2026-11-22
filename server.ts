import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set('etag', false);
app.use(express.json({ limit: '50mb' }));

// Persistent server data directory
const DATA_DIR = path.join(__dirname, 'server-data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const BACKUP_FILE = path.join(DATA_DIR, 'store.bak.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create server-data directory:', err);
  }
}

// In-memory state cache backed by persistent file on disk
let cachedState: any = null;
for (const candidate of [DATA_FILE, BACKUP_FILE]) {
  if (cachedState) break;
  if (fs.existsSync(candidate)) {
    try {
      const raw = fs.readFileSync(candidate, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (!parsed._version) parsed._version = 1;
        cachedState = parsed;
        console.log(
          `[Store] Loaded state from ${path.basename(candidate)} (v${parsed._version}, ${parsed?.purchases?.length || 0} purchases, ${parsed?.dailySales?.length || 0} sales reports, ${parsed?.requests?.length || 0} requests).`
        );
      }
    } catch (err) {
      console.error(`[Store] Failed to read ${path.basename(candidate)}:`, err);
    }
  }
}

// Connected SSE clients for instant cross-device push updates
const sseClients = new Set<express.Response>();

function broadcastSSE(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
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

// GET /api/events - Real-time SSE stream for multi-device sync & admin request alerts
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  res.write(
    `event: connected\ndata: ${JSON.stringify({
      version: cachedState ? cachedState._version || 1 : 0,
      updatedAt: cachedState?.updatedAt || null,
      serverTime: new Date().toISOString(),
    })}\n\n`
  );
  sseClients.add(res);

  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// GET /api/version - Lightweight version check for multi-device polling fallback
app.get('/api/version', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  return res.json({
    success: true,
    version: cachedState ? cachedState._version || 1 : 0,
    updatedAt: cachedState?.updatedAt || null,
    serverTime: new Date().toISOString(),
  });
});

// GET /api/state - Return synchronized state to any device (never cached)
app.get('/api/state', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  if (cachedState) {
    return res.json({
      success: true,
      data: cachedState,
      serverTime: new Date().toISOString(),
      version: cachedState._version || 1,
      updatedAt: cachedState.updatedAt || null,
    });
  }
  return res.json({
    success: true,
    data: null,
    serverTime: new Date().toISOString(),
    version: 0,
    updatedAt: null,
  });
});

function persistStateAtomically(stateObj: any) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const serialized = JSON.stringify(stateObj, null, 2);
  const tmpFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmpFile, serialized, 'utf-8');
  fs.renameSync(tmpFile, DATA_FILE);
  try {
    fs.writeFileSync(BACKUP_FILE, serialized, 'utf-8');
  } catch {
    // Non-fatal backup write
  }
}

function mergeServerUsers(existingUsers: any[], incomingUsers: any[]) {
  const byKey = new Map<string, any>();
  const keyOf = (u: any) => String(u?.userId || u?.username || '').toLowerCase();

  (Array.isArray(existingUsers) ? existingUsers : []).forEach((u) => {
    const k = keyOf(u);
    if (k) byKey.set(k, u);
  });

  (Array.isArray(incomingUsers) ? incomingUsers : []).forEach((u) => {
    const k = keyOf(u);
    if (!k) return;
    const prev = byKey.get(k);
    if (!prev) {
      byKey.set(k, u);
    } else {
      const prevTs = String(prev.updatedAt || '');
      const incTs = String(u.updatedAt || '');
      if (!prevTs || incTs >= prevTs) {
        byKey.set(k, u);
      }
    }
  });

  return Array.from(byKey.values());
}

function mergeByIdDesc(existingArr: any[], incomingArr: any[], idField: string): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const item of [
    ...(Array.isArray(incomingArr) ? incomingArr : []),
    ...(Array.isArray(existingArr) ? existingArr : []),
  ]) {
    const id = String(item?.[idField] || '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

function getRecordStamp(rec: any): string {
  return String(
    rec?.editedAt || rec?.reviewedAt || rec?.updatedAt || rec?.submittedAt || rec?.createdAt || ''
  );
}

function mergeRecordsById(
  existingArr: any[],
  incomingArr: any[],
  idField: string,
  deletedIds?: string[]
): any[] {
  const deletedSet = new Set((deletedIds || []).map((x) => String(x)));
  const byId = new Map<string, any>();

  (Array.isArray(existingArr) ? existingArr : []).forEach((item) => {
    const id = String(item?.[idField] || '');
    if (!id || deletedSet.has(id)) return;
    byId.set(id, item);
  });

  (Array.isArray(incomingArr) ? incomingArr : []).forEach((item) => {
    const id = String(item?.[idField] || '');
    if (!id || deletedSet.has(id)) return;
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, item);
      return;
    }
    // Prefer reviewed/non-pending status over Pending when stamps match or race
    if (prev.status === 'Pending' && item.status && item.status !== 'Pending') {
      byId.set(id, item);
      return;
    }
    if (item.status === 'Pending' && prev.status && prev.status !== 'Pending') {
      return;
    }
    const prevStamp = getRecordStamp(prev);
    const incStamp = getRecordStamp(item);
    if (!prevStamp || incStamp >= prevStamp) {
      byId.set(id, item);
    }
  });

  return Array.from(byId.values());
}

const SLICE_ID_FIELDS: Record<string, string> = {
  purchases: 'batchId',
  requests: 'requestId',
  transfers: 'transferId',
  dailySales: 'reportId',
  operations: 'operationId',
  products: 'productId',
  dropdownOptions: 'optionId',
};

// POST /api/state - Save updated state from any device and persist atomically to disk
app.post('/api/state', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  try {
    const incoming = req.body;
    if (!incoming || typeof incoming !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid state payload' });
    }

    const prevPendingIds = new Set<string>(
      Array.isArray(cachedState?.requests)
        ? cachedState.requests
            .filter((r: any) => r?.status === 'Pending')
            .map((r: any) => String(r.requestId))
        : []
    );

    const version = (cachedState?._version || 0) + 1;
    const updatedAt = new Date().toISOString();

    const { _resetRequested, _baseVersion, _dirtySlices, _deletedIds, _clientId, ...cleanIncoming } =
      incoming;

    const safeUsers = _resetRequested
      ? Array.isArray(cleanIncoming.users)
        ? cleanIncoming.users
        : []
      : Array.isArray(cachedState?.users) && cachedState.users.length > 0
      ? mergeServerUsers(cachedState.users, cleanIncoming.users)
      : Array.isArray(cleanIncoming.users)
      ? cleanIncoming.users
      : [];

    let mergedConflict = false;
    let nextStateBody: any;
    const hasConcurrentUpdate =
      !_resetRequested &&
      cachedState &&
      typeof _baseVersion === 'number' &&
      _baseVersion > 0 &&
      cachedState._version &&
      _baseVersion < cachedState._version &&
      Array.isArray(_dirtySlices) &&
      _dirtySlices.length > 0;

    if (hasConcurrentUpdate) {
      mergedConflict = true;
      nextStateBody = { ...cachedState };
      for (const slice of _dirtySlices) {
        if (slice === 'users') {
          nextStateBody.users = safeUsers;
        } else if (slice === 'auditLog') {
          nextStateBody.auditLog = mergeByIdDesc(
            cachedState.auditLog,
            cleanIncoming.auditLog,
            'auditId'
          );
        } else if (slice === 'ledger') {
          nextStateBody.ledger = mergeByIdDesc(cachedState.ledger, cleanIncoming.ledger, 'ledgerId');
        } else if (SLICE_ID_FIELDS[slice]) {
          nextStateBody[slice] = mergeRecordsById(
            cachedState[slice],
            cleanIncoming[slice],
            SLICE_ID_FIELDS[slice],
            _deletedIds?.[slice]
          );
        } else if (cleanIncoming[slice] !== undefined) {
          nextStateBody[slice] = cleanIncoming[slice];
        }
      }
      nextStateBody.users = safeUsers;
      if (cleanIncoming._catalogVersion) nextStateBody._catalogVersion = cleanIncoming._catalogVersion;
      if (cleanIncoming._openingEpoch) nextStateBody._openingEpoch = cleanIncoming._openingEpoch;
    } else {
      nextStateBody = {
        ...cleanIncoming,
        users: safeUsers,
      };
    }

    const newPendingRequests = Array.isArray(nextStateBody.requests)
      ? nextStateBody.requests.filter(
          (r: any) => r?.status === 'Pending' && !prevPendingIds.has(String(r.requestId))
        )
      : [];

    cachedState = {
      ...nextStateBody,
      _version: version,
      updatedAt,
    };

    persistStateAtomically(cachedState);

    broadcastSSE('state_updated', { version, updatedAt, clientId: _clientId || null });
    if (newPendingRequests.length > 0) {
      broadcastSSE('new_request', {
        version,
        updatedAt,
        count: newPendingRequests.length,
        requests: newPendingRequests,
      });
    }

    return res.json({
      success: true,
      version,
      updatedAt,
      merged: mergedConflict,
      data: mergedConflict ? cachedState : undefined,
    });
  } catch (err: any) {
    console.error('[Store] POST /api/state error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/health
app.get('/api/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    serverTime: new Date().toISOString(),
    hasData: !!cachedState,
    version: cachedState?._version || 0,
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[MM Residency] Server started on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`
    );
  });
}

startServer();
