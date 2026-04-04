const Block = require('./Block');
const fs = require('fs');
const path = require('path');

const CHAIN_FILE = path.join(__dirname, '../../data/chain.json');

class Blockchain {
  constructor() {
    this.chain = [];
    this._load();
    if (this.chain.length === 0) {
      this._createGenesis();
    }
  }

  _createGenesis() {
    const genesis = new Block(0, new Date().toISOString(), 'GENESIS', { message: 'ArthaSetu Genesis Block' }, '0');
    this.chain.push(genesis);
    this._save();
  }

  _load() {
    try {
      if (fs.existsSync(CHAIN_FILE)) {
        const raw = fs.readFileSync(CHAIN_FILE, 'utf-8');
        this.chain = JSON.parse(raw);
      }
    } catch (e) {
      this.chain = [];
    }
  }

  _save() {
    const dir = path.dirname(CHAIN_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CHAIN_FILE, JSON.stringify(this.chain, null, 2));
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addBlock(type, data) {
    const latest = this.getLatestBlock();
    const block = new Block(
      this.chain.length,
      new Date().toISOString(),
      type,
      data,
      latest.hash
    );
    this.chain.push(block);
    this._save();
    return block;
  }

  verifyChain() {
    const issues = [];
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      // Recompute hash
      const Block = require('./Block');
      const recomputed = new Block(
        current.index,
        current.timestamp,
        current.type,
        current.data,
        current.prevHash
      ).hash;

      if (current.hash !== recomputed) {
        issues.push({ blockIndex: i, reason: 'Hash mismatch — block tampered' });
      }
      if (current.prevHash !== previous.hash) {
        issues.push({ blockIndex: i, reason: 'Chain linkage broken' });
      }
    }
    return { valid: issues.length === 0, issues, length: this.chain.length };
  }

  getChain() {
    return this.chain;
  }

  getBlocksByType(type) {
    return this.chain.filter(b => b.type === type);
  }
}

// Singleton
let instance = null;
function getBlockchain() {
  if (!instance) instance = new Blockchain();
  return instance;
}

module.exports = { getBlockchain };
