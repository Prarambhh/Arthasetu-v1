const knex = require('knex');
const knexConfig = require('./knexfile').development || require('./knexfile');
const db = knex(knexConfig);

async function run() {
  try {
    const res = await db('loan_requirements').update({ fulfilled: true }).where({ type: 'guarantors' });
    console.log(`Updated ${res} guarantor requirements to fulfilled.`);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
