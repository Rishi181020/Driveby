const { WebSocketServer } = require('ws');
<<<<<<< HEAD
const db = require('./db');
=======
>>>>>>> origin/ui-merged

function startRelay(port = 3001) {
  const wss = new WebSocketServer({ port });
  let browser = null;
  let rlBackend = null;

<<<<<<< HEAD
=======
  function sendBackendStatus() {
    if (browser && browser.readyState === 1) {
      browser.send(JSON.stringify({
        type: 'backend_status',
        connected: Boolean(rlBackend && rlBackend.readyState === 1)
      }));
    }
  }

>>>>>>> origin/ui-merged
  wss.on('connection', (ws, req) => {
    const type = new URL(req.url, 'ws://localhost').searchParams.get('type');

    if (type === 'rl_backend') {
      rlBackend = ws;
<<<<<<< HEAD
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
=======
      sendBackendStatus();
      ws.on('message', (data) => {
        if (browser && browser.readyState === 1) browser.send(data);
      });
      ws.on('close', () => {
        rlBackend = null;
        sendBackendStatus();
      });
    } else if (type === 'browser') {
      browser = ws;
      sendBackendStatus();
      ws.on('message', (data) => {
        if (rlBackend && rlBackend.readyState === 1) rlBackend.send(data);
      });
      ws.on('close', () => { browser = null; });
    } else {
      ws.close(1008, `Unexpected client type: ${type}`);
>>>>>>> origin/ui-merged
    }
  });

  console.log(`WS relay listening on ws://localhost:${port}`);
}

module.exports = { startRelay };
