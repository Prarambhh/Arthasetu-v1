const { Client } = require('pg');
const c = new Client({user: 'postgres', password: 'postgres', database: 'arthasetu_p2p'});
c.connect().then(async () => {
    try {
        const res = await c.query("SELECT * FROM loan_requirements ORDER BY id DESC LIMIT 5");
        console.log('Requirements:', JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.log(e);
    } finally {
        c.end();
    }
});
