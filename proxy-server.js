/**
 * Simple CORS proxy server for PlexPulse
 *
 * Usage:
 *   1. Run: node proxy-server.js
 *   2. Set VITE_PLEX_PROXY_URL=http://localhost:3001 in your .env file
 *   3. Restart the PlexPulse dev server
 */

const http = require('http');
const https = require('https');

const PORT = 3001;

const server = http.createServer(async (req, res) => {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Only handle /history endpoint
  if (req.method === 'POST' && req.url === '/history') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { serverUrl, token, limit = 5000 } = JSON.parse(body);

        if (!serverUrl || !token) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing serverUrl or token' }));
          return;
        }

        const plexUrl = `${serverUrl}/status/sessions/history/all?sort=viewedAt:desc&limit=${limit}&X-Plex-Token=${token}`;
        const protocol = plexUrl.startsWith('https') ? https : http;

        const plexReq = protocol.get(plexUrl, {
          headers: { 'Accept': 'application/json' },
          rejectUnauthorized: false // Allow self-signed certs
        }, (plexRes) => {
          let data = '';
          plexRes.on('data', chunk => data += chunk);
          plexRes.on('end', () => {
            res.writeHead(plexRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(data);
          });
        });

        plexReq.on('error', (err) => {
          console.error('Plex request error:', err.message);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Failed to connect to Plex: ${err.message}` }));
        });

      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`🚀 PlexPulse CORS Proxy running at http://localhost:${PORT}`);
  console.log(`\nTo use:`);
  console.log(`  1. Create a .env file with: VITE_PLEX_PROXY_URL=http://localhost:${PORT}`);
  console.log(`  2. Restart your PlexPulse dev server`);
});
