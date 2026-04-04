const db = require('./src/p2p/db').default;

(async function() {
  const loans = await db('loans').select('*');
  console.log('--- LOANS ---');
  console.log(loans);

  const wallets = await db('wallets').select('*');
  console.log('--- WALLETS ---');
  console.log(wallets);

  const txs = await db('wallet_transactions').select('*');
  console.log('--- TRANSACTIONS ---');
  console.log(txs);

  process.exit(0);
})();
