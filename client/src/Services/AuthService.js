const API_URL = 'https://d2nxohjr4o1avk.cloudfront.net/api';

export const authService = {
  login: async (email, password) => {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Помилка входу');
    return data.user;
  },

  register: async (name, email, password) => {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Помилка реєстрації');
    return data; // Повертає тільки повідомлення
  },

  verifyRegistration: async (email, code) => {
    const response = await fetch(`${API_URL}/verify-registration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Помилка підтвердження реєстрації');
    return data.user;
  },

  googleLogin: async (credential) => {
    const response = await fetch(`${API_URL}/google-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: credential }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Помилка Google аутентифікації');
    return data.user;
  },

  forgotPassword: async (email) => {
    const response = await fetch(`${API_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Помилка відправки коду');
    return data;
  },

  resetPassword: async (email, code, newPassword) => {
    const response = await fetch(`${API_URL}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Помилка відновлення пароля');
    return data;
  }
};

export default authService;