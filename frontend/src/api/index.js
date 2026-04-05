import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
API.interceptors.request.use(config => {
  const token = localStorage.getItem('arthasetu_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const register = (username) => API.post('/auth/register', { username });
export const getNonce = (walletAddress) => API.get(`/auth/nonce/${walletAddress}`);
export const login = (walletAddress, signature) => API.post('/auth/login', { walletAddress, signature });

// Users
export const getMe = () => API.get('/user/me');
export const getUserProfile = (userId) => API.get(`/user/profile/${userId}`);
export const getAllUsers = () => API.get('/user/all');

// ── Loans v2 ─────────────────────────────────────────────────────────────
export const getMyRequests = () => API.get('/api/v2/loans/me'); // Needs to be written if not exist, or mapped. We can use /api/v2/contracts instead for dashboard.
export const getPendingBroadcasts = () => API.get('/api/v2/loans/pending');
export const createLoan = (amount) => API.post('/api/v2/loans', { amount });
export const acceptLoan = (loanId, interestRate) => API.post(`/api/v2/loans/${loanId}/accept`, { interestRate });
export const addRequirements = (loanId, requirements) => API.post(`/api/v2/loans/${loanId}/requirements`, { requirements });
export const uploadDocument = (loanId, requirementId, fileOrUrl) => {
  if (fileOrUrl instanceof File) {
    const formData = new FormData();
    formData.append('requirementId', requirementId);
    formData.append('file', fileOrUrl);
    return API.post(`/api/v2/loans/${loanId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
  return API.post(`/api/v2/loans/${loanId}/documents`, { requirementId, fileReference: fileOrUrl });
};
export const triggerReview = (loanId) => API.post(`/api/v2/loans/${loanId}/review`);
export const approveLoan = (loanId) => API.post(`/api/v2/loans/${loanId}/approve`);
export const rejectLoan = (loanId) => API.post(`/api/v2/loans/${loanId}/reject`);
export const getLoanDetail = (loanId) => API.get(`/api/v2/loans/${loanId}`);
export const syncOnChainLoan = (id, amount) => API.post('/api/v2/loans/sync', { id, amount });
export const hybridApprove = (loanId, interestRate) => API.post(`/api/v2/loans/${loanId}/hybrid-approve`, { interestRate });
export const repayLoan = (loanId, amount) => API.post(`/api/v2/loans/${loanId}/repay`, { amount }); // V2 Backend Implementation Required

// ── Guarantors v2 ────────────────────────────────────────────────────────
export const addBorrowerGuarantor = (loanId, userId) => API.post(`/api/v2/loans/${loanId}/add-guarantor`, { userId });
export const getGuarantorsForLoan = (loanId) => API.get(`/api/v2/loans/${loanId}/guarantors`);
export const getMyGuarantorRecord = (loanId) => API.get(`/api/v2/loans/${loanId}/guarantors/me`);
export const approveGuarantor = (loanId) => API.post(`/api/v2/loans/${loanId}/guarantors/me/approve`);
export const rejectGuarantor = (loanId) => API.post(`/api/v2/loans/${loanId}/guarantors/me/reject`);

// ── Contracts & Wallet v2 ────────────────────────────────────────────────
export const getContracts = (status) => API.get(`/api/v2/contracts${status ? `?status=${status}` : ''}`);
export const getContractDetail = (contractId) => API.get(`/api/v2/contracts/${contractId}`);
export const getMyWallet = () => API.get('/api/v2/wallets/me');

// Chain
export const getChain = () => API.get('/chain');
export const verifyChain = () => API.get('/chain/verify');
export const getBlock = (index) => API.get(`/chain/block/${index}`);
export const getBlocksByType = (type) => API.get(`/chain/type/${type}`);

// Health
export const getHealth = () => API.get('/health');

export default API;
