<<<<<<< HEAD
const WS_URL = 'ws://localhost:3001';
const SEND_INTERVAL_MS = 100;

export class AgentSocket {
  constructor(agents, environment) {
    this.agents = agents;
    this.environment = environment;
    this.ws = null;
    this._tick = 0;
    this._connected = false;
    this._backendConnected = false;
=======
const WS_URL = 'ws://localhost:3001?type=browser';
const SEND_INTERVAL_MS = 100;

export class AgentSocket {
  constructor(agentManager, onStatus) {
    this.agentManager = agentManager;
    this.onStatus = onStatus;
    this.ws = null;
    this._tick = 0;
    this._connected = false;
    this._sendTimer = null;
    this._status = 'not-started';
    this.environment = null;
>>>>>>> origin/ui-merged
    this._connect();
  }

  _connect() {
<<<<<<< HEAD
    try {
      this.ws = new WebSocket(WS_URL);
    } catch {
      return; // Server not running - fallback stays active
    }

    this.ws.addEventListener('open', () => {
      this._connected = true;
      this._startSending();
    });

    this.ws.addEventListener('message', (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'backend_status') {
          this._backendConnected = msg.connected;
        } else if (msg.type === 'actions') {
          for (const act of msg.agents) {
            const agent = this.agents[act.id];
            if (agent) {
              if (act.reset) {
                agent.reset(true); // reset back to Point A of current route
              } else {
                agent.lastAction = {
                  throttle: act.throttle,
                  steering: act.steering,
                  brake: act.brake
                };
              }
              agent.generation = act.generation;
              agent.bestScore = act.bestScore;
            }
          }
        }
      } catch { /* ignore */ }
=======
    this._setStatus('connecting');
    this.ws = new WebSocket(WS_URL);

    this.ws.addEventListener('open', () => {
      this._connected = true;
      if (this._status !== 'backend-connected') {
        this._setStatus('relay-connected');
      }
      this._startSending();
    });

    this.ws.addEventListener('message', async (e) => {
      const msg = JSON.parse(await decodeMessageData(e.data));
      if (msg.type === 'backend_status') {
        this._setStatus(msg.connected ? 'backend-connected' : 'waiting-for-backend');
        return;
      }

      if (msg.type !== 'actions') {
        throw new Error(`Unexpected RL backend message type: ${msg.type}`);
      }
      if (!Array.isArray(msg.agents)) {
        throw new Error('RL backend actions message is missing agents array.');
      }
      this._setStatus('backend-connected');
      this.agentManager.applyActions(msg.agents);
>>>>>>> origin/ui-merged
    });

    this.ws.addEventListener('close', () => {
      this._connected = false;
<<<<<<< HEAD
      // Reconnect after 3s
      setTimeout(() => this._connect(), 3000);
    });

    this.ws.addEventListener('error', () => {
      this.ws.close();
=======
      this._setStatus('closed');
    });

    this.ws.addEventListener('error', (event) => {
      this._connected = false;
      this._setStatus('error');
      console.error('RL WebSocket connection failed.', event);
>>>>>>> origin/ui-merged
    });
  }

  _startSending() {
<<<<<<< HEAD
    setInterval(() => {
      if (!this._connected || this.ws.readyState !== WebSocket.OPEN) return;

      const payloadAgents = this.agents.map(agent => {
        let isCollided = false;
        if (agent.collided && !agent.collisionReported) {
          isCollided = true;
          agent.collisionReported = true;
        }
        return {
          id: agent.id,
          state: agent.getStateVector(this.agents, this.environment),
          collided: isCollided,
          score: agent.score
        };
      });

      const payload = {
        type: 'observations',
        tick: this._tick++,
        agents: payloadAgents
      };
      
      this.ws.send(JSON.stringify(payload));
    }, SEND_INTERVAL_MS);
  }
=======
    if (this._sendTimer) clearInterval(this._sendTimer);
    this._sendTimer = setInterval(() => {
      if (!this._connected || this.ws.readyState !== WebSocket.OPEN) return;
      if (!this.environment) {
        throw new Error('AgentSocket requires environment before sending neural observations.');
      }
      const payload = {
        type: 'observations',
        tick: this._tick++,
        agents: this.agentManager.agents.map((agent) => {
          let collided = false;
          if (agent.collided && !agent.collisionReported) {
            collided = true;
            agent.collisionReported = true;
          }
          return {
            id: agent.id,
            state: agent.getStateVector(this.agentManager.agents, this.environment),
            collided,
            score: agent.score
          };
        }),
      };
      this.ws.send(JSON.stringify(payload));
    }, SEND_INTERVAL_MS);
  }

  setEnvironment(environment) {
    this.environment = environment;
  }

  _setStatus(status) {
    this._status = status;
    if (this.onStatus) this.onStatus(status);
  }
}

async function decodeMessageData(data) {
  if (typeof data === 'string') return data;
  if (data instanceof Blob) return data.text();
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  throw new Error(`Unsupported WebSocket message payload: ${Object.prototype.toString.call(data)}`);
>>>>>>> origin/ui-merged
}
