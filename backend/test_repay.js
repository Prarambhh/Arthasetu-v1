/**
 * test_repay.js — Test the V2 repay endpoint end-to-end.
 * Run with: node test_repay.js
 */
require('dotenv').config();
require('ts-node').register({ project: require('path').join(__dirname, 'tsconfig.json'), transpileOnly: true });

const axios = require('axios');
const jwt = require('jsonwebtoken');
const db = require('./src/p2p/db').default;

const JWT_SECRET = process.env.JWT_SECRET || 'arthasetu_secret';
const BASE = 'http://localhost:5000';

async function main() {
  // Get the loan
  const loan = await db('loans').first();
  if (!loan) { console.error('No loans found!'); process.exit(1); }
  console.log('Loan:', loan);

  // Mint a JWT for the borrower
  const token = jwt.sign({ userId: loan.borrower_id, walletAddress: 'test' }, JWT_SECRET, { expiresIn: '1h' });

  // Check borrower wallet balance
  const wallet = await db('wallets').where({ user_id: loan.borrower_id }).first();
  console.log('Borrower wallet:', wallet);

  if (parseFloat(wallet.balance) < parseFloat(loan.amount)) {
    console.log(`Borrower balance ${wallet.balance} < loan ${loan.amount}. Topping up...`);
    await db('wallets').where({ user_id: loan.borrower_id }).update({ balance: parseFloat(loan.amount) + 5000 });
    console.log('Balance topped up.');
  }

  // Call repay
  console.log(`\nCalling POST /api/v2/loans/${loan.id}/repay with amount=${loan.amount}`);
  const res = await axios.post(
    `${BASE}/api/v2/loans/${loan.id}/repay`,
    { amount: parseFloat(loan.amount) },
    { headers: { Authorization: `Bearer ${token}` } }
  ).catch(e => e.response);

  console.log('\nResponse status:', res.status);
  console.log('Response body:  ', JSON.stringify(res.data, null, 2));

  // Show final balances
  const borrowerWallet = await db('wallets').where({ user_id: loan.borrower_id }).first();
  const lenderWallet = await db('wallets').where({ user_id: loan.lender_id }).first();
  console.log('\nFinal borrower balance:', borrowerWallet.balance);
  console.log('Final lender balance:  ', lenderWallet.balance);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
