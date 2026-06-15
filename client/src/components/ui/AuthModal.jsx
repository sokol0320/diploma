import React, { useState } from 'react';
import { authService } from '../../Services/AuthService';
import { GoogleLogin } from '@react-oauth/google';

export const AuthModal = ({ onLogin }) => {
  // Можливі режими: 'login', 'register', 'verify-reg', 'forgot', 'reset'
  const [mode, setMode] = useState('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    code: '',
    password: '',
    passwordConfirm:'' 
  });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{6,}$/;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
    if (successMsg) setSuccessMsg('');
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setError('');
    try {
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
    if (mode === 'register' || mode === 'reset') {
      if (mode === 'reset' && formData.code.length < 6) {
         setError('Введіть коректний 6-значний код');
         return false;
      }
      if (!passwordRegex.test(formData.password)) {
        setError('Пароль має містити мінімум 6 символів, одну літеру та одну цифру');
        return false;
      }
      else if(formData.password !== formData.passwordConfirm){
        setError('Паролі не збігаються');
        return false;
      }
    } else if (mode === 'verify-reg' && formData.code.length < 6) {
      setError('Введіть 6-значний код з пошти');
      return false;
    } else if (mode === 'login' && formData.password.length === 0) {
      setError('Введіть пароль');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode !== 'forgot' && !validateForm()) return;
    if (mode === 'forgot' && !emailRegex.test(formData.email)) {
        setError('Введіть коректний Email');
        return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    
    try {
      if (mode === 'login') {
        const user = await authService.login(formData.email, formData.password);
        onLogin(user);

      } else if (mode === 'register') {
        // 1. Відправляємо запит на реєстрацію (сервер шле код)
        const res = await authService.register(formData.name, formData.email, formData.password);
        setSuccessMsg(res.message);
        setMode('verify-reg'); // Перемикаємо на форму введення коду

      } else if (mode === 'verify-reg') {
        // 2. Відправляємо код для підтвердження
        const user = await authService.verifyRegistration(formData.email, formData.code);
        onLogin(user);

      } else if (mode === 'forgot') {
        const res = await authService.forgotPassword(formData.email);
        setSuccessMsg(res.message);
        setMode('reset');

      } else if (mode === 'reset') {
        const res = await authService.resetPassword(formData.email, formData.code, formData.password);
        setSuccessMsg(res.message);
        setTimeout(() => {
            setMode('login');
            setFormData({ name: '', email: '', code: '', password: '', passwordConfirm: '' });
            setSuccessMsg('');
        }, 3000);
      }
    } catch (err) {
      setError(err.message || 'Щось пішло не так');
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch(mode) {
      case 'login': return 'Вхід у систему';
      case 'register': return 'Реєстрація';
      case 'verify-reg': return 'Підтвердження пошти';
      case 'forgot': return 'Відновлення пароля';
      case 'reset': return 'Новий пароль';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 scale-100">
        
        <div className="bg-blue-600 dark:bg-blue-800 p-6 text-center transition-colors duration-300">
          <h2 className="text-2xl font-bold text-white">{getTitle()}</h2>
          <p className="text-blue-100 dark:text-blue-200 text-sm mt-2">Керування розумним вікном</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ваше ім'я
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  value={formData.name}
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
                value={formData.email}
                disabled={mode === 'reset' || mode === 'verify-reg'}
                placeholder="admin@smart.home"
                className={`w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border rounded-lg outline-none transition-all ${
                  error && !emailRegex.test(formData.email) && formData.email.length > 0 
                    ? 'border-red-500 focus:ring-red-200' 
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                } ${mode === 'reset' || mode === 'verify-reg' ? 'opacity-60 cursor-not-allowed' : ''}`}
                onChange={handleChange}
              />
            </div>

            {(mode === 'reset' || mode === 'verify-reg') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Код з пошти
                </label>
                <input
                  name="code"
                  type="text"
                  required
                  value={formData.code}
                  placeholder="123456"
                  maxLength="6"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all tracking-widest text-center font-bold"
                  onChange={handleChange}
                />
              </div>
            )}

            {(mode === 'login' || mode === 'register' || mode === 'reset') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {mode === 'reset' ? 'Новий пароль' : 'Пароль'}
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  onChange={handleChange}
                />
              </div>
            )}
            
            {(mode === 'register' || mode === 'reset') && (
              <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
               Підтвердіть пароль
              </label>
              <input
                name="passwordConfirm"
                type="password"
                required
                value={formData.passwordConfirm}
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
            
            {successMsg && (
              <div className="text-green-600 dark:text-green-400 text-sm text-center bg-green-50 dark:bg-green-900/30 p-2 rounded border border-green-200 dark:border-green-800">
                ✅ {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transform transition hover:-translate-y-0.5 disabled:opacity-70 flex justify-center items-center"
            >
              {isLoading ? 'Завантаження...' : 
                mode === 'login' ? 'Увійти' : 
                mode === 'register' ? 'Зареєструватися' : 
                mode === 'verify-reg' ? 'Підтвердити пошту' :
                mode === 'forgot' ? 'Отримати код' : 
                'Зберегти пароль'
              }
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-4 text-center">
                <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(''); setSuccessMsg(''); }}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 transition-colors"
                >
                    Забули пароль?
                </button>
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
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
                  text={mode === 'login' ? 'signin_with' : 'signup_with'}
                />
              </div>
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
              {mode === 'login' ? 'Немає акаунту?' : 'Вже є акаунт?'}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError('');
                  setSuccessMsg('');
                  setFormData({ name: '', email: '', code: '', password: '', passwordConfirm: '' });
                }}
                className="ml-2 font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 transition-colors"
              >
                {mode === 'login' ? 'Зареєструватися' : 'Увійти'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};