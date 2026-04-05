require('dotenv').config();
// Enable TypeScript imports for the new P2P module
require('ts-node').register({ project: require('path').join(__dirname, 'tsconfig.json'), transpileOnly: true });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Ensure data and uploads directories exist
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use('/uploads', express.static(UPLOADS_DIR));

// Initialize blockchain (loads from disk or creates genesis)
const { getBlockchain } = require('./src/blockchain/Blockchain');
getBlockchain();

// Run seed data
const { seed } = require('./src/seed/seed');
seed();

// Legacy routes
app.use('/auth', require('./src/routes/auth'));
app.use('/loan', require('./src/routes/loan'));
app.use('/user', require('./src/routes/user'));
app.use('/chain', require('./src/routes/chain'));

// ── P2P Lending routes (TypeScript domain) ──────────────────────────────
const { default: p2pRouter } = require('./src/p2p/routes');
app.use('/api/v2', p2pRouter);

// Health check
app.get('/health', (req, res) => {
  const chain = getBlockchain();
  const verify = chain.verifyChain();
  res.json({
    status: 'ArthaSetu Protocol Online',
    chainLength: chain.getChain().length,
    chainValid: verify.valid,
    timestamp: new Date().toISOString(),
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler (handles both legacy errors and typed domain errors)
const { errorHandler } = require('./src/p2p/middleware/errorHandler');
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🔗 ArthaSetu Protocol running on http://localhost:${PORT}`);
  console.log(`🔍 Chain Explorer: http://localhost:${PORT}/chain`);
  console.log(`✅ Health Check:   http://localhost:${PORT}/health\n`);
});
