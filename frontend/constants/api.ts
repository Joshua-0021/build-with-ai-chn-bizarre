/**
 * API Configuration
 */

// Change this to your backend URL
// For Android emulator: http://10.0.2.2:8000
// For iOS simulator / physical device: http://<your-ip>:8000
// For web: http://localhost:8000
export const API_BASE_URL = 'http://172.20.10.3:8000';

export const Endpoints = {
  // Auth
  LOGIN: '/api/v1/auth/login',
  REGISTER: '/api/v1/auth/register',

  // User
  DASHBOARD: '/api/v1/users/dashboard',
  REDEEM: '/api/v1/users/redeem',
  REDEMPTIONS: '/api/v1/users/redemptions',

  // Green Army
  CLASSIFY_ONLY: '/api/v1/greenarmy/classify-only',
  CONFIRM_WASTE: '/api/v1/greenarmy/confirm',
  GA_TRANSACTIONS: '/api/v1/greenarmy/transactions',

  // QR
  VALIDATE_QR: '/api/v1/qr/validate',

  // Config
  POINTS_CONFIG: '/api/v1/points-config',
};
