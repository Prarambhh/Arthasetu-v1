const axios = require('axios');
const EC = require('elliptic').ec;
const CryptoJS = require('crypto-js');
const ec = new EC('secp256k1');

const API = axios.create({ baseURL: 'http://localhost:5000' });

function signMessage(message, privateKeyHex) {
  const keyPair = ec.keyFromPrivate(privateKeyHex, 'hex');
  const msgHash = CryptoJS.SHA256(message).toString();
  const signature = keyPair.sign(msgHash);
  return signature.toDER('hex');
}

async function login(walletAddress, privateKey) {
  const nonceRes = await API.get(`/auth/nonce/${walletAddress}`);
  const nonce = nonceRes.data.nonce;
  const signature = signMessage(nonce, privateKey);
  const loginRes = await API.post('/auth/login', { walletAddress, signature });
  return loginRes.data.token;
}

async function runTest() {
  try {
    console.log("🚀 Starting Guarantor Flow Test...\n");

    // 1. Register 3 users
    const bRes = await API.post('/auth/register', { username: 'test_borrower_' + Date.now() });
    const lRes = await API.post('/auth/register', { username: 'test_lender_' + Date.now() });
    const gRes = await API.post('/auth/register', { username: 'test_guarantor_' + Date.now() });

    const borrower = bRes.data;
    const lender = lRes.data;
    const guarantor = gRes.data;

    console.log("✅ Users registered.");
    console.log(`   Borrower: ${borrower.username} (${borrower.userId})`);
    console.log(`   Lender: ${lender.username} (${lender.userId})`);
    console.log(`   Guarantor: ${guarantor.username} (${guarantor.userId})\n`);

    // 2. Login
    const bToken = await login(borrower.walletAddress, borrower.privateKey);
    const lToken = await login(lender.walletAddress, lender.privateKey);
    const gToken = await login(guarantor.walletAddress, guarantor.privateKey);
    
    // Auth helpers
    const bApi = axios.create({ baseURL: 'http://localhost:5000', headers: { Authorization: `Bearer ${bToken}` } });
    const lApi = axios.create({ baseURL: 'http://localhost:5000', headers: { Authorization: `Bearer ${lToken}` } });
    const gApi = axios.create({ baseURL: 'http://localhost:5000', headers: { Authorization: `Bearer ${gToken}` } });

    // 3. Borrower creates loan
    const loanRes = await bApi.post('/api/v2/loans', { amount: 5000 });
    const loanId = loanRes.data.data.id;
    console.log(`✅ Loan created by Borrower. Loan ID: ${loanId}`);

    // 4. Lender accepts loan
    await lApi.post(`/api/v2/loans/${loanId}/accept`);
    console.log(`✅ Lender accepted the loan.`);

    // 5. Lender adds guarantor requirement
    await lApi.post(`/api/v2/loans/${loanId}/requirements`, {
      requirements: [{ type: 'guarantors', label: 'Need a trusted ally', userId: guarantor.userId }]
    });
    console.log(`✅ Lender added Guarantor requirement for ${guarantor.username}.`);

    // 6. Guarantor checks their record
    const gRecordRes = await gApi.get(`/api/v2/loans/${loanId}/guarantors/me`);
    console.log(`✅ Guarantor found their record. Status: ${gRecordRes.data.data.status}`);

    // 7. Guarantor approves
    await gApi.post(`/api/v2/loans/${loanId}/guarantors/me/approve`);
    console.log(`✅ Guarantor clicked "Accept Guarantee".`);

    // 8. Lender triggers review
    await lApi.post(`/api/v2/loans/${loanId}/review`);
    console.log(`✅ Lender advanced loan to Review Phase.`);

    // 9. Lender approves & disburses
    await lApi.post(`/api/v2/loans/${loanId}/approve`);
    console.log(`✅ Lender approved and disbursed funds!`);

    console.log("\n🎉 Flow completed successfully!");

  } catch(e) {
    console.error("\n❌ Test failed:", e?.response?.data || e.message);
  }
}

runTest();
