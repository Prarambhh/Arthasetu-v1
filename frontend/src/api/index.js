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

// Loans
export const getAllLoans = () => API.get('/loan/all');
export const getLoan = (loanId) => API.get(`/loan/${loanId}`);
export const createLoan = (amount, durationDays) => API.post('/loan/create', { amount, durationDays });
export const fundLoan = (loanId) => API.post('/loan/fund', { loanId });
export const repayLoan = (loanId, amount) => API.post('/loan/repay', { loanId, amount });

// Chain
export const getChain = () => API.get('/chain');
export const verifyChain = () => API.get('/chain/verify');
export const getBlock = (index) => API.get(`/chain/block/${index}`);
export const getBlocksByType = (type) => API.get(`/chain/type/${type}`);

// Health
export const getHealth = () => API.get('/health');

export default API;
