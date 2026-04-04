import fs from 'fs';
import path from 'path';
import knex from 'knex';
import config from '../../knexfile';

const db = knex((config as any)['development']);

async function run() {
  try {
    const rawData = fs.readFileSync(path.join(__dirname, '../../data/users.json'), 'utf-8');
    const users = JSON.parse(rawData);

    for (const u of users) {
      // Upsert User
      await db('users')
        .insert({
          id: u.userId,
          name: u.username,
          email: `${u.username}@example.com`,
          hashed_password: 'mock_password_do_not_use'
        })
        .onConflict('id').ignore();
      
      console.log(`Upserted user ${u.username}`);

      // Upsert Wallet
      await db('wallets')
        .insert({
          user_id: u.userId,
          balance: u.balance || 0
        })
        .onConflict('user_id').ignore();
        
      console.log(`Upserted wallet for ${u.username}`);
    }

    console.log('Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
