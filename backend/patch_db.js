const { Client } = require('pg');
const c = new Client({user: 'postgres', password: 'postgres', database: 'arthasetu_p2p'});
c.connect().then(async () => {
    try {
        const res = await c.query("SELECT id FROM loans WHERE status = 'requested'");
        for (const row of res.rows) {
            // Check if requirements exist
            const r = await c.query(`SELECT id FROM loan_requirements WHERE loan_id = $1`, [row.id]);
            if (r.rows.length === 0) {
                await c.query(`INSERT INTO loan_requirements (loan_id, type, label) VALUES ($1, 'document', 'Government ID')`, [row.id]);
                await c.query(`INSERT INTO loan_requirements (loan_id, type, label) VALUES ($1, 'document', 'Income Validation')`, [row.id]);
                console.log("Added requirements to old loan:", row.id);
            }
        }
        console.log("Database patch complete.");
    } catch (e) {
        console.log("Error:", e.message);
    } finally {
        c.end();
    }
});
