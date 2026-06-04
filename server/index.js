const path = require('path');
const fs = require('fs');

try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch {}

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const AIRouter = require('./ai-router');
const WorkflowEngine = require('./workflow-engine');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const DATA_DIR = path.join(__dirname, 'data');

app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(path.join(DATA_DIR, 'workflows.json'))) {
    fs.writeFileSync(path.join(DATA_DIR, 'workflows.json'), '[]');
  }
} catch {}

function readJSON(file) {
  try {
    const p = path.join(DATA_DIR, file);
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch { return []; }
}
function writeJSON(file, data) {
  try {
    fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
  } catch {}
}

// === Khởi tạo engine ===
const aiRouter = new AIRouter(process.env);
const workflowEngine = new WorkflowEngine(aiRouter, process.env);

let scheduler = null;
if (!process.env.VERCEL) {
  try {
    const Scheduler = require('./scheduler');
    scheduler = new Scheduler(workflowEngine);
    scheduler.start();
  } catch (e) { console.error('Scheduler init error:', e.message); }
}

// === API: Workflows ===
app.get('/api/workflows', (req, res) => {
  res.json(readJSON('workflows.json'));
});

app.post('/api/workflows', (req, res) => {
  const workflows = readJSON('workflows.json');
  const wf = {
    id: uuidv4(),
    name: req.body.name || 'Luồng mới',
    description: req.body.description || '',
    trigger: req.body.trigger || { type: 'manual' },
    actions: req.body.actions || [],
    status: req.body.status || 'active',
    runs: 0,
    lastRun: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  workflows.push(wf);
  writeJSON('workflows.json', workflows);
  if (scheduler && wf.trigger.type === 'schedule') {
    scheduler.register(wf);
  }
  res.json(wf);
});

app.put('/api/workflows/:id', (req, res) => {
  const workflows = readJSON('workflows.json');
  const idx = workflows.findIndex(w => w.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const old = workflows[idx];
  if (scheduler && old.trigger.type === 'schedule') scheduler.unregister(old.id);
  workflows[idx] = { ...old, ...req.body, id: old.id, updatedAt: new Date().toISOString() };
  writeJSON('workflows.json', workflows);
  if (scheduler && workflows[idx].trigger.type === 'schedule') scheduler.register(workflows[idx]);
  res.json(workflows[idx]);
});

app.delete('/api/workflows/:id', (req, res) => {
  let workflows = readJSON('workflows.json');
  const wf = workflows.find(w => w.id === req.params.id);
  if (scheduler && wf && wf.trigger.type === 'schedule') scheduler.unregister(wf.id);
  workflows = workflows.filter(w => w.id !== req.params.id);
  writeJSON('workflows.json', workflows);
  res.json({ ok: true });
});

app.post('/api/workflows/:id/run', async (req, res) => {
  const workflows = readJSON('workflows.json');
  const wf = workflows.find(w => w.id === req.params.id);
  if (!wf) return res.status(404).json({ error: 'Not found' });
  const result = await workflowEngine.execute(wf, req.body?.payload || {});
  wf.runs = (wf.runs || 0) + 1;
  wf.lastRun = new Date().toISOString();
  writeJSON('workflows.json', workflows);
  res.json(result);
});

// === API: AI (trực tiếp) ===
app.post('/api/ai/process', async (req, res) => {
  const { text, task } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text' });
  try {
    const result = await aiRouter.process(text, task || 'general');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ai/models', (req, res) => {
  res.json(aiRouter.getModels());
});

// === API: Webhook receiver ===
app.post('/api/webhook/:workflowId', async (req, res) => {
  const workflows = readJSON('workflows.json');
  const wf = workflows.find(w => w.id === req.params.workflowId);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  if (wf.trigger.type !== 'webhook') return res.status(400).json({ error: 'Not a webhook workflow' });
  const result = await workflowEngine.execute(wf, req.body);
  res.json(result);
});

// === API: Dashboard stats ===
app.get('/api/stats', (req, res) => {
  const workflows = readJSON('workflows.json');
  res.json({
    totalWorkflows: workflows.length,
    activeWorkflows: workflows.filter(w => w.status === 'active').length,
    totalRuns: workflows.reduce((s, w) => s + (w.runs || 0), 0),
    modelsAvailable: aiRouter.getModels().length
  });
});

// === SPA fallback ===
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

if (require.main === module || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`⚡ AutoFlow AI running at http://localhost:${PORT}`);
  });
}

module.exports = app;
