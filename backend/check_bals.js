const db = require('./src/p2p/db').default;

(async function() {
  const w1 = await db('wallets').where({user_id: 'e02a009c-a3d1-4ab5-a6d3-e4ef908fb379'}).first();
  const w2 = await db('wallets').where({user_id: '3a99efb1-9db9-4566-94a0-457b4801b140'}).first();
  console.log('Lender:', w1.balance, 'Borrower:', w2.balance);
  process.exit(0);
})();
