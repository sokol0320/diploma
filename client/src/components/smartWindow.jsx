import React, { useState, useEffect, useCallback } from 'react';

// --- НАЛАШТУВАННЯ API ---
const API_BASE = 'http://193.33.207.39/';


const SmartWindow = ({device, ...props}) => {
  const [windowState, setWindowState] = useState('closed'); 
  const [isMotorBusy, setIsMotorBusy] = useState(false);
  const [error, setError] = useState(null);
  const [side, setSide] = useState(() => {
  // Check if side exists and has the .data array
  if (device?.side?.data && Array.isArray(device.side.data)) {
    return device.side.data[0];
  }
  // Fallback to a default (e.g., 1 for left, 0 for right) if structure is different
  return device?.side ?? 1; 
  });
  
  // Статус мережі
  const [netStatus, setNetStatus] = useState({ 
    online: false, 
    latency: null, 
    lastCode: null 
  });

  // Функція синхронізації з контролером
  const refreshStatus = useCallback(async () => {
    // ВАЖЛИВО: Оскільки ви передаєте device.guid, я замінив змінну GUID на device.guid
    const currentGuid = device?.guid || 'UNKNOWN_GUID'; 
    const startTime = Date.now();
    try {
      const response = await fetch(API_BASE, {
         method: 'POST',
         headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
        go: 'status',
        guid: currentGuid
        })
      });
      if (!response.ok) throw new Error();

      const data = await response.json();
      const info = data.status; // Парсимо масив
      if (info === 403) throw new Error();
      const endTime = Date.now();

      // Оновлюємо статус мережі
      setNetStatus({
        online: true,
        latency: endTime - startTime,
        lastCode: info
      });

      // Мапінг кодів
      const statusMap = { 
        100: 'busy', 
        200: 'open', 
        300: 'ventilation', 
        400: 'closed' 
      };
      
      const current = statusMap[info];

      if (current === 'busy') {
        setIsMotorBusy(true);
      } else {
        setIsMotorBusy(false);
        if (current) setWindowState(current);
      }
      setError(null);

    } catch (err) {
      setNetStatus(prev => ({ ...prev, online: false, latency: null }));
      setError('Зв’язок втрачено');
    }
  }, [device?.guid]); // Додав залежність

  // Опитування сервера кожні 3 секунди
  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 2000);
    return () => clearInterval(interval);
  }, [refreshStatus]);


  const handleAction = async (action) => {
    if (isMotorBusy || !netStatus.online) return;
    const currentGuid = device?.guid || 'UNKNOWN_GUID';
    const commandMap = { 
      'open': 'open', 
      'closed': 'close', 
      'ventilation': 'tilt' 
    };
    
    setError(null);
    try {
       await fetch(API_BASE, {
         method: 'POST',
         headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
        go: commandMap[action],
        guid: currentGuid
        })
      });
      setIsMotorBusy(true); // Блокуємо до наступного refreshStatus
    } catch (err) {
      setError('Помилка виконання команди');
    }
  };

  // --- СТИЛІ ---
  const getSashStyles = () => {
    // Додано dark:bg-gray-800 та dark:border-gray-700
    const baseStyles = "relative w-full h-full bg-white/90 dark:bg-gray-800/90 border-[12px] border-white dark:border-gray-700 transition-all duration-1000 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] shadow-lg [transform-style:preserve-3d]";
  if(side === 1){
    switch (windowState) {
      case 'open': return `${baseStyles} origin-left [transform:rotateY(-45deg)]`;
      case 'ventilation': return `${baseStyles} origin-bottom [transform:rotateX(-15deg)]`; 
      default: return `${baseStyles} origin-left [transform:rotateY(0)_rotateX(0)]`;
    }
  }
  else{
    switch (windowState) {
      case 'open': return `${baseStyles} origin-right [transform:rotateY(45deg)]`;
      case 'ventilation': return `${baseStyles} origin-bottom [transform:rotateX(-15deg)]`; 
      default: return `${baseStyles} origin-right [transform:rotateY(0)_rotateX(0)]`;
    }
  }
  };

  const getHandleStyles = () => {
    // Додано dark:bg-gray-400
    const baseStyles = `absolute ${side === 1 ? "right-4":"left-4"} top-1/2 -mt-[30px] w-3 h-16 bg-gray-800 dark:bg-gray-400 rounded transition-transform duration-700 origin-[50%_90%]`;

      switch (windowState) {
      case 'open': return `${baseStyles} ${side === 1? "rotate-[-90deg]": "rotate-[90deg]"} `;
      case 'ventilation': return `${baseStyles} rotate-0`;
      default: return `${baseStyles} ${side === 1? "rotate-[-180deg]": "rotate-[180deg]"}`;
    }
    
  };

  const getButtonClass = (actionType) => {
    const isActive = windowState === actionType;
    // Базові стилі для обох тем
    const base = "flex items-center justify-center px-6 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border";
    if (isActive) {
        // Активний стан (світла/темна)
        return `${base} bg-blue-600 text-white shadow-lg ring-2 ring-blue-300 dark:ring-blue-800 border-blue-600`;
    }
    // Неактивний стан (світла/темна)
    return `${base} bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700`;
  };

  return (
    // Видалено min-h-screen та bg-gray-100, оскільки фон вже керується в App.jsx. 
    // Залишено flex-col та центрування для самої картки.
    <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl transition-colors duration-300 border border-gray-100 dark:border-gray-700 relative w-full max-w-md">
      
      {/* ПАНЕЛЬ СТАТУСУ МЕРЕЖІ */}
      <div className="mb-6 w-full max-w-[300px] bg-gray-50 dark:bg-gray-900 p-3 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-[11px] transition-colors duration-300">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Network Status</span>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${netStatus.online ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
            <span className={`font-black ${netStatus.online ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
              {netStatus.online ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
        <div className="flex gap-4 text-gray-500 dark:text-gray-400">
          <span>Ping: <b className="text-gray-700 dark:text-gray-300">{netStatus.latency ? `${netStatus.latency}ms` : '--'}</b></span>
          <span>Last Code: <b className="text-gray-700 dark:text-gray-300">{netStatus.lastCode || 'None'}</b></span>
        </div>
      </div>

      <div className="mb-8 text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 transition-colors duration-300">
            {device?.deviceName || 'Smart Window'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium transition-colors duration-300">
          {isMotorBusy ? '⚙️ Двигун працює...' : '✅ Система готова'}
        </p>
      </div>

      {/* ВІЗУАЛІЗАЦІЯ ВІКНА */}
      <div className="relative w-[300px] h-[400px] bg-gray-300 dark:bg-gray-700 border-[20px] border-gray-400 dark:border-gray-600 rounded-lg shadow-inner [perspective:1000px] mb-8 transition-colors duration-300">
        <div className={getSashStyles()}>
          {/* Скло вікна (трохи затемнене в dark mode) */}
          <div className="relative w-full h-full border border-gray-200 dark:border-gray-600 overflow-hidden bg-gradient-to-br from-sky-300/30 to-sky-300/10 dark:from-sky-900/30 dark:to-sky-900/10 backdrop-blur-[1px] transition-colors duration-300">
            <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-br from-white/40 dark:from-white/10 to-transparent rotate-[30deg] pointer-events-none"></div>
            <div className={getHandleStyles()}>
              {/* Основа ручки */}
              <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-gray-600 dark:bg-gray-300 rounded-full transition-colors duration-300"></div>
            </div>
          </div>
        </div>
        
        {/* Індикатор завантаження при русі */}
        {isMotorBusy && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/5 dark:bg-black/20 rounded-sm backdrop-blur-[1px]">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* КНОПКИ КЕРУВАННЯ */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => handleAction('open')} disabled={isMotorBusy || !netStatus.online} className={getButtonClass('open')}>
            Відчинити
          </button>
          <button onClick={() => handleAction('ventilation')} disabled={isMotorBusy || !netStatus.online} className={getButtonClass('ventilation')}>
            Провітрювання
          </button>
        </div>
        <button onClick={() => handleAction('closed')} disabled={isMotorBusy || !netStatus.online} className={`${getButtonClass('closed')} w-full py-4 text-lg`}>
          Зачинити вікно
        </button>
      </div>

      {error && (
        <div className="mt-6 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-2 animate-bounce text-sm font-bold transition-colors duration-300">
          ⚠️ {error}
        </div>
      )}

      <div className="mt-6 text-[10px] text-gray-400 dark:text-gray-500 font-mono italic transition-colors duration-300">
        IP: 172.16.12.142 | GUID: <span className="text-gray-500 dark:text-gray-400">{device?.guid}</span>
      </div>

    </div>
  );
};

export default SmartWindow;