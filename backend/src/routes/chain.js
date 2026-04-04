const express = require('express');
const router = express.Router();
const { getBlockchain } = require('../blockchain/Blockchain');

/**
 * GET /chain
 * Returns the full blockchain.
 */
router.get('/', (req, res) => {
  const chain = getBlockchain().getChain();
  res.json({ length: chain.length, chain });
});

/**
 * GET /chain/verify
 * Verifies chain integrity — recomputes all hashes.
 */
router.get('/verify', (req, res) => {
  const result = getBlockchain().verifyChain();
  res.json(result);
});

/**
 * GET /chain/block/:index
 * Returns a single block by index.
 */
router.get('/block/:index', (req, res) => {
  const chain = getBlockchain().getChain();
  const idx = parseInt(req.params.index);
  if (isNaN(idx) || idx < 0 || idx >= chain.length) {
    return res.status(404).json({ error: 'Block not found' });
  }
  res.json(chain[idx]);
});

/**
 * GET /chain/type/:type
 * Returns blocks filtered by type.
 */
router.get('/type/:type', (req, res) => {
  const blocks = getBlockchain().getBlocksByType(req.params.type.toUpperCase());
  res.json({ count: blocks.length, blocks });
});

module.exports = router;
