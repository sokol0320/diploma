import React, { useState, useEffect, useCallback } from 'react';
import { DeviceSettingsModal, DeviceDetailsModal } from './ui';

const API_BASE = 'https://d2nxohjr4o1avk.cloudfront.net/api/device-command';

const SmartWindow = ({device, onDeviceUpdate, ...props}) => {
  const [windowState, setWindowState] = useState('closed'); 
  const [isMotorBusy, setIsMotorBusy] = useState(false);
  const [error, setError] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const [side, setSide] = useState(1);
  
  const [netStatus, setNetStatus] = useState({ 
    online: false, 
    latency: null, 
    lastCode: null 
  });

  // Синхронізуємо сторону відкриття ВИКЛЮЧНО з базою даних (через prop device)
  useEffect(() => {
    if (device?.side?.data && Array.isArray(device.side.data)) {
      setSide(device.side.data[0]);
    } else if (device?.side !== undefined) {
      setSide(device.side);
    }
  }, [device?.side]);

  const refreshStatus = useCallback(async () => {
    const currentGuid = device?.guid || 'UNKNOWN_GUID'; 
    const startTime = Date.now();
    try {
      const response = await fetch(API_BASE, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ go: 'status', guid: currentGuid })
      });
      
      const data = await response.json();
      
      // Перевірка на 403 (Плата відключена від PHP-сервера)
      if (!response.ok || data.error || data.status === undefined || data.status === 403) {
          throw new Error(data.error || 'Пристрій офлайн');
      }

      const endTime = Date.now();
      setNetStatus({ online: true, latency: endTime - startTime, lastCode: data.status });

      let isMoving = false;
      let actualStatus = data.status;

      if (typeof data.message === 'string' && data.message.includes('{')) {
          try {
              const innerJson = JSON.parse(data.message);
              if (innerJson.message === "Moving") isMoving = true;
              if (innerJson.status) actualStatus = innerJson.status;
          } catch (e) {
              if (data.message.includes("Moving")) isMoving = true;
          }
      } else if (data.message === "Moving") {
          isMoving = true;
      }

      if (isMoving) {
        setIsMotorBusy(true); 
      } else {
        setIsMotorBusy(false);
        const statusMap = { 
            200: 'open', 
            300: 'ventilation', 
            400: 'closed', 
            700: 'orientation changed(left)', 
            800: 'orientation changed(right)' 
        };
        
        if (statusMap[actualStatus]) {
          setWindowState(statusMap[actualStatus]);
        }
      }
      setError(null);

    } catch (err) {
      // Ставимо ОФЛАЙН
      setNetStatus(prev => ({ ...prev, online: false, latency: null }));
      setError('Зв’язок втрачено (Пристрій офлайн)');
    }
  }, [device?.guid]);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 2000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  const handleAction = async (action) => {
    if (isMotorBusy || !netStatus.online) return;
    const currentGuid = device?.guid || 'UNKNOWN_GUID';
    const commandMap = { 'open': 'open', 'closed': 'close', 'ventilation': 'tilt' };
    
    setError(null);
    setIsMotorBusy(true); 
    
    try {
       const response = await fetch(API_BASE, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ go: commandMap[action], guid: currentGuid })
       });
       
       const data = await response.json();
       
       if (!response.ok || data.error) {
           throw new Error(data.error || 'Помилка');
       }
    } catch (err) {
      setError('Помилка виконання команди');
      setIsMotorBusy(false);
    }
  };

  const getSashStyles = () => {
    const baseStyles = "relative w-full h-full bg-white/90 dark:bg-gray-800/90 border-[12px] border-white dark:border-gray-700 transition-all duration-1000 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] shadow-lg [transform-style:preserve-3d]";
    if(side === 1){
      switch (windowState) {
        case 'open': return `${baseStyles} origin-left [transform:rotateY(-45deg)]`;
        case 'ventilation': return `${baseStyles} origin-bottom [transform:rotateX(-15deg)]`; 
        case 'orientation changed(left)': return `${baseStyles} origin-left [transform:rotateY(0)_rotateX(0)]`;
        default: return `${baseStyles} origin-left [transform:rotateY(0)_rotateX(0)]`;
      }
    } else {
      switch (windowState) {
        case 'open': return `${baseStyles} origin-right [transform:rotateY(45deg)]`;
        case 'ventilation': return `${baseStyles} origin-bottom [transform:rotateX(-15deg)]`; 
        case 'orientation changed(right)': return `${baseStyles} origin-right [transform:rotateY(0)_rotateX(0)]`;
        default: return `${baseStyles} origin-right [transform:rotateY(0)_rotateX(0)]`;
      }
    }
  };

  const getHandleStyles = () => {
    const baseStyles = `absolute ${side === 1 ? "right-4":"left-4"} top-1/2 -mt-[30px] w-3 h-16 bg-gray-800 dark:bg-gray-400 rounded transition-transform duration-700 origin-[50%_90%]`;
    switch (windowState) {
      case 'open': return `${baseStyles} ${side === 1? "rotate-[-90deg]": "rotate-[90deg]"} `;
      case 'ventilation': return `${baseStyles} rotate-0`;
      default: return `${baseStyles} ${side === 1? "rotate-[-180deg]": "rotate-[180deg]"}`;
    }
  };

  const getButtonClass = (actionType) => {
    const isActive = windowState === actionType;
    const base = "flex items-center justify-center px-6 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border";
    if (isActive) return `${base} bg-blue-600 text-white shadow-lg ring-2 ring-blue-300 dark:ring-blue-800 border-blue-600`;
    return `${base} bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl transition-colors duration-300 border border-gray-100 dark:border-gray-700 relative w-full max-w-md">
      
      <button 
        onClick={() => setIsSettingsOpen(true)}
        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
      >
        ⚙️
      </button>

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

      <div className="relative w-[300px] h-[400px] bg-gray-300 dark:bg-gray-700 border-[20px] border-gray-400 dark:border-gray-600 rounded-lg shadow-inner [perspective:1000px] mb-8 transition-colors duration-300">
        <div className={getSashStyles()}>
          <div className="relative w-full h-full border border-gray-200 dark:border-gray-600 overflow-hidden bg-gradient-to-br from-sky-300/30 to-sky-300/10 dark:from-sky-900/30 dark:to-sky-900/10 backdrop-blur-[1px] transition-colors duration-300">
            <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-br from-white/40 dark:from-white/10 to-transparent rotate-[30deg] pointer-events-none"></div>
            <div className={getHandleStyles()}>
              <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-gray-600 dark:bg-gray-300 rounded-full transition-colors duration-300"></div>
            </div>
          </div>
        </div>
        
        {isMotorBusy && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/5 dark:bg-black/20 rounded-sm backdrop-blur-[1px]">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

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

        <button 
          onClick={() => setIsDetailsOpen(true)} 
          className="w-full py-3 mt-2 border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 font-bold rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-300"
        >
          ⚙️ Детальне керування (Розклад і Погода)
        </button>
      </div>

      {error && (
        <div className="mt-6 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-2 animate-bounce text-sm font-bold transition-colors duration-300">
          ⚠️ {error}
        </div>
      )}

      <div className="mt-6 text-[10px] text-gray-400 dark:text-gray-500 font-mono italic transition-colors duration-300">
        IP: 193.33.207.39 | GUID: <span className="text-gray-500 dark:text-gray-400">{device?.guid}</span>
      </div>

      <DeviceSettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        device={device} 
        onUpdate={onDeviceUpdate} 
      />
      
      <DeviceDetailsModal 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)} 
        device={device} 
      />
    </div>
  );
};

export default SmartWindow;