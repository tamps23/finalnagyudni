const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const DATA_FILE = path.join(__dirname, 'data.json');
const app = express();
app.use(cors());
app.use(express.json({limit: '50mb'}));

// Load or initialize state
let state = {};
try {
  state = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || {};
} catch (e) {
  state = {};
}

function persist() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2)); } catch(e){ console.error('Persist failed', e); }
}

// SSE clients
const clients = [];
function broadcast(key, value) {
  const payload = JSON.stringify({ key, value });
  clients.forEach(res => res.write(`data: ${payload}\n\n`));
}

app.get('/api/state', (req, res) => {
  res.json(state);
});

app.post('/api/set', (req, res) => {
  const { key, value } = req.body || {};
  if(typeof key === 'undefined') return res.status(400).json({error:'missing key'});
  state[key] = value;
  persist();
  broadcast(key, value);
  res.json({ok:true});
});

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write('\n');
  clients.push(res);
  req.on('close', () => {
    const idx = clients.indexOf(res);
    if(idx !== -1) clients.splice(idx,1);
  });
});

// Serve static files (the current folder)
app.use('/', express.static(path.join(__dirname)));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
