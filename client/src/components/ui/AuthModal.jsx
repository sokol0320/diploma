import React, { useState } from 'react';
import { authService } from '../../Services/AuthService';
import { GoogleLogin } from '@react-oauth/google'; // Додано імпорт


export const AuthModal = ({ onLogin }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirm:'' 
  });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{6,}$/;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  // Обробник успішного входу через Google
  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setError('');
    try {
      // Викликаємо метод, який ми раніше додали в authService
      const user = await authService.googleLogin(credentialResponse.credential);
      onLogin(user);
    } catch (err) {
      setError(err.message || 'Помилка Google авторизації');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    if (!emailRegex.test(formData.email)) {
      setError('Будь ласка, введіть коректний Email адресу');
      return false;
    }
    if (!isLoginMode) {
      if (!passwordRegex.test(formData.password)) {
        setError('Пароль має містити мінімум 6 символів, одну літеру та одну цифру');
        return false;
      }
      else if(formData.password != formData.passwordConfirm){
        setError('Паролі не збігаються')
        return false;
      }
    } else if (formData.password.length === 0) {
      setError('Введіть пароль');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setError('');
    try {
      let user;
      if (isLoginMode) {
        user = await authService.login(formData.email, formData.password);
      } else {
        user = await authService.register(formData.name, formData.email, formData.password);
      }
      onLogin(user);
    } catch (err) {
      setError(err.message || 'Щось пішло не так');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 scale-100">
        
        <div className="bg-blue-600 dark:bg-blue-800 p-6 text-center transition-colors duration-300">
          <h2 className="text-2xl font-bold text-white">
            {isLoginMode ? 'Вхід у систему' : 'Реєстрація'}
          </h2>
          <p className="text-blue-100 dark:text-blue-200 text-sm mt-2">
            Керування розумним вікном
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLoginMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ваше ім'я
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Олександр"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  onChange={handleChange}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="admin@smart.home"
                className={`w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border rounded-lg outline-none transition-all ${
                  error && !emailRegex.test(formData.email) && formData.email.length > 0 
                    ? 'border-red-500 focus:ring-red-200' 
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                }`}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Пароль
              </label>
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                onChange={handleChange}
              />
            </div>
            {!isLoginMode && (
              <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
               Підтвердіть Пароль
              </label>
              <input
                name="passwordConfirm"
                type="password"
                required
                placeholder="••••••••"
                className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                onChange={handleChange}
              />
            </div>
          )}
            {error && (
              <div className="text-red-600 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-900/30 p-2 rounded border border-red-200 dark:border-red-800 animate-pulse">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transform transition hover:-translate-y-0.5 disabled:opacity-70 flex justify-center items-center"
            >
              {isLoading ? 'Завантаження...' : (isLoginMode ? 'Увійти' : 'Зареєструватися')}
            </button>
          </form>

          {/* --- БЛОК АБО + GOOGLE КНОПКА --- */}
          <div className="mt-6">
            <div className="relative flex items-center justify-center mb-6">
              <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
              <span className="flex-shrink mx-4 text-gray-400 text-xs uppercase tracking-wider">Або через</span>
              <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
            </div>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Помилка Google входу')}
                theme="filled_blue"
                shape="pill"
                width="100%"
                text={isLoginMode ? 'signin_with' : 'signup_with'}
              />
            </div>
          </div>
          {/* ------------------------------- */}

          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            {isLoginMode ? 'Немає акаунту?' : 'Вже є акаунт?'}
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setError('');
                setFormData({ name: '', email: '', password: '' });
              }}
              className="ml-2 font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 transition-colors"
            >
              {isLoginMode ? 'Зареєструватися' : 'Увійти'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

