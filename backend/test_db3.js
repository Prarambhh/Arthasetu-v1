const { Client } = require('pg');
const c = new Client({user: 'postgres', password: 'postgres', database: 'arthasetu_p2p'});
c.connect().then(async () => {
    try {
        await c.query(`INSERT INTO loan_requirements (loan_id, type, label) VALUES ('c96e2e8c-a74c-494e-87e5-1193550034f8', 'document', 'Test')`);
        console.log("Insert success!");
    } catch (e) {
        console.log("Error:", e.message);
    } finally {
        c.end();
    }
});
