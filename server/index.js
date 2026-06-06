<<<<<<< HEAD
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const path = require('path');
const { startRelay } = require('./wsRelay');
const db = require('./db');
=======
const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const { startRelay } = require('./wsRelay');
>>>>>>> origin/ui-merged

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, '..')));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

startRelay(3001);
<<<<<<< HEAD
db.init();
=======

const rlBackend = spawn('python3', [path.join(__dirname, '..', 'rl', 'server.py')], {
  env: {
    ...process.env
  },
  stdio: 'inherit'
});

function shutdown() {
  rlBackend.kill('SIGINT');
  process.exit(0);
}

rlBackend.on('exit', (code, signal) => {
  throw new Error(`RL backend process exited: code=${code} signal=${signal}`);
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
>>>>>>> origin/ui-merged
