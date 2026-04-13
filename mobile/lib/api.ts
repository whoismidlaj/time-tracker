import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Production API URL
// const API_URL = 'https://timetracker.onlyfrens.fun/api';
export const API_URL = 'http://192.168.10.218:3000/api';

let onAuthError: (() => void) | null = null;

export const setAuthErrorCallback = (callback: () => void) => {
  onAuthError = callback;
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userData');
      if (onAuthError) onAuthError();
    }
    return Promise.reject(error);
  }
);

export default api;
