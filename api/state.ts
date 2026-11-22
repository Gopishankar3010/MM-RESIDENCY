// Vercel Serverless Function for /api/state
// Enables persistent state synchronization across devices when deployed to Vercel

let vercelCachedState: any = null;

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      data: vercelCachedState,
      serverTime: new Date().toISOString(),
      version: vercelCachedState?._version || 0
    });
  }

  if (req.method === 'POST') {
    const incoming = req.body;
    if (!incoming || typeof incoming !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid state' });
    }

    const version = (vercelCachedState?._version || 0) + 1;
    vercelCachedState = {
      ...incoming,
      _version: version,
      updatedAt: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      version,
      updatedAt: vercelCachedState.updatedAt
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
