import { useState,useCallback, useEffect } from 'react';
import './App.css';
import SmartWindow from './components/smartWindow';
import {AuthModal, ThemeToggle, AddDeviceModal} from './components/ui'

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('app_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [devices, setDevices] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
// 1. Memoized fetch function
  const fetchDevices = useCallback(async () => {
    if (!user) {
      setDevices([]);
      return;
    }

    const ownerId = typeof user === 'object' ? user.id : user;

    try {
      const response = await fetch(`http://localhost:3306/devices/${ownerId}`);
      if (response.ok) {
        const data = await response.json();
        setDevices(data);
      } else {
        console.error('Не вдалося завантажити пристрої');
      }
    } catch (error) {
      console.error('Помилка мережі:', error);
    }
  }, [user]);

  // 2. Effect to fetch data when component mounts or user changes
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // 3. Effect to sync user with LocalStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('app_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('app_user');
    }
  }, [user]);
  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };
  const handleLogout = () => {
    setUser(null);
  };

  const handleDeviceAdded = (newDevice) => {
    setDevices((prevDevices) => [...prevDevices, newDevice]);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300" id = "main">
      
      {!user && <AuthModal onLogin={handleLoginSuccess} />}

      {/* НОВИЙ ПОВНОЦІННИЙ ХЕДЕР */}
      {user && (
        <header className="w-full bg-white dark:bg-gray-800 shadow-sm py-4 px-6 flex justify-between items-center transition-colors duration-300 sticky top-0 z-40 border-b border-gray-200 dark:border-gray-700">
          
          {/* Логотип / Назва зліва */}
          <div className="text-xl font-bold text-gray-800 dark:text-gray-100 hidden sm:block">
            Smart<span className="text-blue-600 dark:text-blue-400">Window</span>
          </div>
          
          {/* Панель керування справа */}
          <div className="flex items-center gap-4 ml-auto">
            
            <ThemeToggle />

            <div className="text-right hidden sm:block">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Користувач</p>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                {typeof user === 'object' ? user.name || user.email : user}
              </p>
            </div>
            
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm"
            >
              + Додати пристрій
            </button>

            <button
              onClick={handleLogout} 
              className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 rounded-lg hover:bg-red-50 dark:hover:bg-gray-700 transition shadow-sm"
            >
              Вийти
            </button>
          </div>
        </header>
      )}

      <AddDeviceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onDeviceAdded={handleDeviceAdded} 
        user={user}
        Customfetch = {fetchDevices} 
      />

      {user && (
        <div className="flex flex-wrap gap-6 p-10 justify-center">
          {devices.length === 0 ? (
             <p className="text-gray-500 dark:text-gray-400 mt-10">
                У вас поки немає доданих пристроїв. Натисніть "+ Додати пристрій".
             </p>
          ) : (
            devices.map((device) => (
              <SmartWindow 
  key={device?.guid||Math.random()} 
  device={device} 
  user={user} 
  onLogout={handleLogout} 
  onDeviceUpdate={fetchDevices} 
/>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default App;