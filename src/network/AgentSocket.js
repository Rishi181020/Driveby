const WS_URL = 'ws://localhost:3001';
const SEND_INTERVAL_MS = 100;

export class AgentSocket {
  constructor(agents, environment) {
    this.agents = agents;
    this.environment = environment;
    this.ws = null;
    this._tick = 0;
    this._connected = false;
    this._connect();
  }

  _connect() {
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
        if (msg.type === 'actions') {
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
    });

    this.ws.addEventListener('close', () => {
      this._connected = false;
      // Reconnect after 3s
      setTimeout(() => this._connect(), 3000);
    });

    this.ws.addEventListener('error', () => {
      this.ws.close();
    });
  }

  _startSending() {
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
}
