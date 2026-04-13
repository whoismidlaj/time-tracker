const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function apiClient(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    credentials: 'include', // Important for cookies
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  const response = await fetch(url, defaultOptions);
  
  if (response.status === 401 && !url.includes('/auth/login')) {
    // Optional: trigger a logout or redirect if unauthorized
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth-unauthorized'));
    }
  }

  return response;
}
