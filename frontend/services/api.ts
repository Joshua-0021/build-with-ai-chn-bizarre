/**
 * API Service Layer — Axios wrapper with JWT token injection
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, Endpoints } from '../constants/api';
import { Platform } from 'react-native';

// Create Axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — inject JWT token
api.interceptors.request.use(
  async (config) => {
    try {
      let token: string | null;
      if (Platform.OS === 'web') {
        token = localStorage.getItem('pachapp_token');
      } else {
        token = await SecureStore.getItemAsync('pachapp_token');
      }
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // Token retrieval failed — continue without auth
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle common errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — handle logout in components
    }
    return Promise.reject(error);
  }
);

// --- Auth ---
export const authAPI = {
  login: (house_id: string, password: string) =>
    api.post(Endpoints.LOGIN, { house_id, password }),

  register: (house_id: string, password: string, role: string) =>
    api.post(Endpoints.REGISTER, { house_id, password, role }),
};

// --- User Dashboard ---
export const userAPI = {
  getDashboard: () =>
    api.get(Endpoints.DASHBOARD),

  redeemPoints: (points: number) =>
    api.post(Endpoints.REDEEM, { points }),

  getRedemptions: () =>
    api.get(Endpoints.REDEMPTIONS),
};

// --- Green Army ---
export const greenArmyAPI = {
  classifyOnly: (house_id: string, imageUri: string, fileName: string) => {
    const formData = new FormData();
    formData.append('house_id', house_id);
    formData.append('image', {
      uri: imageUri,
      name: fileName || 'waste.jpg',
      type: 'image/jpeg',
    } as any);

    return api.post(Endpoints.CLASSIFY_ONLY, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },

  confirmWaste: (house_id: string, waste_data: Record<string, number>, image_ref: string) =>
    api.post(Endpoints.CONFIRM_WASTE, { house_id, waste_data, image_ref }),

  getTransactions: () =>
    api.get(Endpoints.GA_TRANSACTIONS),
};

// --- QR ---
export const qrAPI = {
  validate: (qr_id: string, house_id: string, points_redeemed: number) =>
    api.post(Endpoints.VALIDATE_QR, { qr_id, house_id, points_redeemed }),
};

export default api;
