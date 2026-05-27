// src/services/authService.js

const API_URL = 'http://localhost:3306'; // Адреса нашого сервера

export const authService = {
  // --- LOGIN ---
  login: async (email, password) => {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Якщо сервер повернув помилку (400, 500)
      throw new Error(data.message || 'Помилка входу');
    }

    return data.user;
  },

  // --- REGISTER ---
  register: async (name, email, password) => {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Помилка реєстрації');
    }

    return data.user;
  },
  googleLogin: async (credential) => {
    const response = await fetch(`${API_URL}/google-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: credential }), // Відправляємо токен Google на бекенд
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Помилка Google аутентифікації');

    return data.user;
  }
};

export default authService;