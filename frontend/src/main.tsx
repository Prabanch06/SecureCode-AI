import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import api from './lib/api';

// Global window.fetch patch to support JWT and auto-refresh natively
const originalFetch = window.fetch;
window.fetch = async function (input, init) {
  let headers = new Headers(init?.headers || {});
  const token = localStorage.getItem('access_token');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  let newInit = { ...init, headers };
  let response = await originalFetch(input, newInit);
  
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        const refreshResponse = await api.post('/api/auth/token/refresh/', {
          refresh: refreshToken
        });
        const newAccess = refreshResponse.data.access;
        localStorage.setItem('access_token', newAccess);
        if (refreshResponse.data.refresh) {
          localStorage.setItem('refresh_token', refreshResponse.data.refresh);
        }
        headers.set('Authorization', `Bearer ${newAccess}`);
        newInit.headers = headers;
        response = await originalFetch(input, newInit);
      } catch (err) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.reload();
      }
    }
  }
  return response;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
