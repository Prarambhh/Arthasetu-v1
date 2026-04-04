const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { UserStore } = require('../models/UserStore');
const { WalletService } = require('../services/WalletService');
const { generateWallet, verifySignature } = require('../services/WalletService');
const { getBlockchain } = require('../blockchain/Blockchain');
// Sync new users into pg for P2P v2
let pgDb = null;
try { pgDb = require('../p2p/db').default; } catch(e) { /* p2p module not loaded */ }

const JWT_SECRET = process.env.JWT_SECRET || 'arthasetu_secret';

/**
 * POST /auth/register
 * Creates a new wallet-based identity.
 * Returns: { userId, walletAddress, publicKey, privateKey (ONCE ONLY), nonce }
 */
router.post('/register', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    // Check duplicate username
    const existing = UserStore.getAll().find(u => u.username === username.trim());
    if (existing) return res.status(409).json({ error: 'Username already taken' });

    const wallet = generateWallet();
    const userId = uuidv4();
    const nonce = uuidv4(); // challenge nonce for future signing

    const user = UserStore.create({
      userId,
      username: username.trim(),
      walletAddress: wallet.walletAddress,
      publicKey: wallet.publicKey,
      nonce,
    });

    getBlockchain().addBlock('USER_REGISTERED', {
      userId,
      username: username.trim(),
      walletAddress: wallet.walletAddress,
    });

    // Private key is returned ONCE — user must save it
    const responsePayload = {
      message: 'Wallet created. Save your private key — it will NOT be shown again.',
      userId: user.userId,
      username: user.username,
      walletAddress: user.walletAddress,
      publicKey: user.publicKey,
      privateKey: wallet.privateKey, // only shown at registration
      creditScore: user.creditScore,
      trustTier: user.trustTier,
      balance: user.balance,
    };

    // Sync into PostgreSQL for v2 P2P endpoints
    if (pgDb) {
      try {
        await pgDb('users').insert({ id: userId, name: username.trim(), email: `${username.trim()}@arthasetu.app`, hashed_password: 'legacy_wallet_auth' }).onConflict('id').ignore();
        await pgDb('wallets').insert({ user_id: userId, balance: user.balance || 10000 }).onConflict('user_id').ignore();
      } catch (pgErr) { console.error('[PG Sync Error]', pgErr.message); }
    }

    res.status(201).json(responsePayload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /auth/login
 * DeFi-style: user signs their nonce with their private key.
 * Body: { walletAddress, signature }
 */
router.post('/login', (req, res) => {
  try {
    const { walletAddress, signature } = req.body;
    if (!walletAddress || !signature) {
      return res.status(400).json({ error: 'walletAddress and signature required' });
    }

    const user = UserStore.findByWallet(walletAddress);
    if (!user) return res.status(404).json({ error: 'Wallet not found' });

    // Verify signature against the stored nonce
    const valid = verifySignature(user.nonce, signature, user.publicKey);
    if (!valid) return res.status(401).json({ error: 'Invalid signature — authentication failed' });

    // Rotate nonce after successful auth
    const newNonce = uuidv4();
    UserStore.update(user.userId, { nonce: newNonce });

    const token = jwt.sign(
      { userId: user.userId, walletAddress: user.walletAddress },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      userId: user.userId,
      username: user.username,
      walletAddress: user.walletAddress,
      creditScore: user.creditScore,
      trustTier: user.trustTier,
      balance: user.balance,
      nonce: newNonce, // new nonce for next login
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /auth/nonce/:walletAddress
 * Returns the current challenge nonce for a wallet (pre-login step).
 */
router.get('/nonce/:walletAddress', (req, res) => {
  const user = UserStore.findByWallet(req.params.walletAddress);
  if (!user) return res.status(404).json({ error: 'Wallet not found' });
  res.json({ nonce: user.nonce, walletAddress: user.walletAddress });
});

module.exports = router;
