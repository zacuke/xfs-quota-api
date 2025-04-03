const express = require('express');
const fs = require('fs').promises;
const { exec } = require('child_process');
const app = express();
require('dotenv').config();

app.use(express.json());

// Get configuration from environment variables 
const PORT = process.env.PORT ;
const MOUNT_POINT = process.env.MOUNT_POINT;
const SECRET_KEY = process.env.SECRET_KEY;
const LISTEN_IP = process.env.LISTEN_IP;

// --- Authentication Middleware ---
function authenticate(req, res, next) {
  const providedKey = req.query.secret;
  
  if (!providedKey) {
    return res.status(401).json({ error: 'Secret key is required' });
  }
  
  if (providedKey !== SECRET_KEY) {
    return res.status(403).json({ error: 'Invalid secret key' });
  }
  
  next();
}

// Apply authentication to all routes
app.use(authenticate);

// --- Helper Functions ---

// Get the next available project ID
async function getNextProjectId() {
  const projects = await fs.readFile('/etc/projects', 'utf-8');
  const ids = projects.split('\n')
    .filter(line => line.trim())
    .map(line => parseInt(line.split(':')[0]));
  return Math.max(...ids, 0) + 1;
}

// Add a customer to /etc/projects and /etc/projid
async function addCustomer(customerName) {
  const projectId = await getNextProjectId();
  const projectPath = `${MOUNT_POINT}/${customerName}`;

  // Create directory (if needed)
  await fs.mkdir(projectPath, { recursive: true });

  // Add to /etc/projects
  await fs.appendFile('/etc/projects', `${projectId}:${projectPath}\n`);

  // Add to /etc/projid
  await fs.appendFile('/etc/projid', `${customerName}:${projectId}\n`);

  // Initialize project quota
  await execPromise(`xfs_quota -x -c "project -s ${customerName}" ${MOUNT_POINT}`);

  // Set default quota (50M)
  await setQuota(customerName, "50M");

  return { customerName, projectId, path: projectPath };
}

// Update quota (e.g., "50M" or "100G")
async function setQuota(customerName, size) {
  await execPromise(`xfs_quota -x -c "limit -p bhard=${size} ${customerName}" ${MOUNT_POINT}`);
}

// Wrap exec in a promise
function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(stderr || error);
      else resolve(stdout);
    });
  });
}

// --- API Endpoints ---

// 1. Add a customer
app.post('/customers', async (req, res) => {
  try {
    const { customer } = req.body;
    if (!customer) throw new Error('Missing customer name');
    const result = await addCustomer(customer);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. Update quota
app.post('/customers/:customer/quota', async (req, res) => {
  try {
    const { customer } = req.params;
    const { size } = req.body;
    if (!size) throw new Error('Missing size (e.g., "50M")');
    await setQuota(customer, size);
    res.json({ customer, size });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Get quota report (raw xfs_quota output)
app.get('/report', async (req, res) => {
  try {
    const report = await execPromise(`xfs_quota -x -c "report -p" ${MOUNT_POINT}`);
    res.send(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function initializeQuotaFiles() {
  try {
    // Check if files exist, create them if they don't
    await Promise.all([
      fs.access('/etc/projects').catch(() => fs.writeFile('/etc/projects', '')),
      fs.access('/etc/projid').catch(() => fs.writeFile('/etc/projid', ''))
    ]);
    console.log('Quota system files verified/initialized');
  } catch (err) {
    console.error('Failed to initialize quota files:', err);
    process.exit(1); // Exit if we can't initialize properly
  }
}

// Initialize files when starting up
initializeQuotaFiles().then(() => {
  app.listen(PORT, LISTEN_IP, () => {
    console.log(`API running on http://${LISTEN_IP}:${PORT}`);
    console.log(`Mount point: ${MOUNT_POINT}`);
    console.log('Authentication is enabled - requests require ?secret=KEY');
  });
});