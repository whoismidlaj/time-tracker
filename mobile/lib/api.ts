import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Production API URL
const API_URL = 'https://timetracker.onlyfrens.fun/api';

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

export default api;
