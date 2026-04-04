require('dotenv').config();
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
app.use(express.json());

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Initialize blockchain (loads from disk or creates genesis)
const { getBlockchain } = require('./src/blockchain/Blockchain');
getBlockchain();

// Run seed data
const { seed } = require('./src/seed/seed');
seed();

// Routes
app.use('/auth', require('./src/routes/auth'));
app.use('/loan', require('./src/routes/loan'));
app.use('/user', require('./src/routes/user'));
app.use('/chain', require('./src/routes/chain'));

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

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🔗 ArthaSetu Protocol running on http://localhost:${PORT}`);
  console.log(`🔍 Chain Explorer: http://localhost:${PORT}/chain`);
  console.log(`✅ Health Check:   http://localhost:${PORT}/health\n`);
});
