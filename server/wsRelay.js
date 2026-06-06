const { WebSocketServer } = require('ws');
const db = require('./db');

function startRelay(port = 3001) {
  const wss = new WebSocketServer({ port });
  let browser = null;
  let rlBackend = null;

  wss.on('connection', (ws, req) => {
    const type = new URL(req.url, 'ws://localhost').searchParams.get('type');

    if (type === 'rl_backend') {
      rlBackend = ws;
      if (browser && browser.readyState === 1) browser.send(JSON.stringify({ type: 'backend_status', connected: true }));
      
      ws.on('message', (data) => {
        if (browser && browser.readyState === 1) browser.send(data);
      });
      
      ws.on('close', () => { 
        rlBackend = null; 
        if (browser && browser.readyState === 1) browser.send(JSON.stringify({ type: 'backend_status', connected: false }));
      });
    } else {
      // default: browser client
      browser = ws;
      console.log('[ws] browser connected');

      // Tell the browser immediately if the backend is already connected
      if (rlBackend && rlBackend.readyState === 1) {
        browser.send(JSON.stringify({ type: 'backend_status', connected: true }));
      } else {
        browser.send(JSON.stringify({ type: 'backend_status', connected: false }));
      }

      let _obsCnt = 0;
      ws.on('message', (data) => {
        if (rlBackend && rlBackend.readyState === 1) rlBackend.send(data);
        try {
          const msg = JSON.parse(data);
          if (msg.type === 'observations') {
            db.buffer(msg.tick, msg.agents);
            if (++_obsCnt === 1) console.log('[ws] receiving observations — db buffer active');
          }
        } catch { /* non-JSON or malformed — ignore */ }
      });
      ws.on('close', () => { browser = null; console.log('[ws] browser disconnected'); });
    }
  });

  console.log(`WS relay listening on ws://localhost:${port}`);
}

module.exports = { startRelay };
