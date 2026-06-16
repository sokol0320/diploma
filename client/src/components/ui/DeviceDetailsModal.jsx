import React, { useState, useEffect, useCallback } from 'react';

export const DeviceDetailsModal = ({ isOpen, onClose, device }) => {
  const [rules, setRules] = useState([]);
  const [isAddingRule, setIsAddingRule] = useState(false);
  
  // Стан для погоди
  const [weather, setWeather] = useState({
    wind: '--',
    humidity: '--',
    precipitation: '--',
    isWarning: false,
    isLoading: true
  });
  
  const [newRule, setNewRule] = useState({
    start_time: '08:00',
    end_time: '09:00',
    days: [],
    mode: 'Провітрювання'
  });

  const allDays = ['Пн', 'Вв', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

  // Завантаження погоди
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=49.5883&longitude=34.5514&current=relative_humidity_2m,wind_speed_10m,precipitation&timezone=auto');
        const data = await res.json();
        
        const windSpeed = data.current.wind_speed_10m;
        const humidity = data.current.relative_humidity_2m;
        const precip = data.current.precipitation; 

        setWeather({
          wind: windSpeed.toFixed(1),
          humidity: humidity,
          precipitation: precip,
          isWarning: precip > 0.1 || windSpeed > 10,
          isLoading: false
        });
      } catch (e) {
        setWeather(prev => ({ ...prev, isLoading: false }));
      }
    };
    if (isOpen) fetchWeather();
  }, [isOpen]);

  const fetchRules = useCallback(async () => {
    if (!device?.guid) return;
    try {
      const res = await fetch(`http://localhost:3306/rules/${device.guid}`);
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        const formattedData = data.map(rule => {
            let parsedDays = [];
            try { parsedDays = typeof rule.days === 'string' ? JSON.parse(rule.days) : rule.days; } catch (e) {}
            return { ...rule, days: parsedDays };
        });
        setRules(formattedData);
      }
    } catch (e) {
      console.error("Помилка завантаження правил:", e);
    }
  }, [device?.guid]);

  useEffect(() => {
    if (isOpen) fetchRules();
  }, [isOpen, fetchRules]);

  const handleAddRule = async () => {
    if (newRule.days.length === 0) return alert("Оберіть хоча б один день тижня!");
    if (!device?.guid) return alert("Помилка: відсутній GUID");

    try {
      const res = await fetch(`http://localhost:3306/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guid: device.guid, ...newRule })
      });

      if (res.ok) {
        fetchRules();
        setIsAddingRule(false);
        setNewRule({ start_time: '08:00', end_time: '09:00', days: [], mode: 'Провітрювання' });
      } else {
        alert("Помилка збереження. Перевірте сервер.");
      }
    } catch (e) {
      alert("Не вдалося з'єднатися з сервером.");
    }
  };

  const toggleRule = async (id, currentStatus) => {
    try {
      await fetch(`http://localhost:3306/rules/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      fetchRules();
    } catch (e) {}
  };

  const deleteRule = async (id) => {
    try {
      await fetch(`http://localhost:3306/rules/${id}`, { method: 'DELETE' });
      fetchRules();
    } catch (e) {}
  };

  const toggleDay = (day) => {
    setNewRule(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] p-6 relative custom-scrollbar">
        
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur pb-2 z-10 border-b border-gray-100 dark:border-gray-700">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Детальне керування</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{device?.deviceName || 'Smart Window'}</p>
            </div>
            <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full transition">
                ✖
            </button>
        </div>

        {/* БЛОК 1: Розклад */}
        <div className="mb-8 p-5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    📅 Розклад автоматичного провітрювання
                </h3>
                <button 
                  onClick={() => setIsAddingRule(!isAddingRule)}
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition shadow-sm"
                >
                    {isAddingRule ? 'Скасувати' : '+ Створити правило'}
                </button>
            </div>

            {isAddingRule && (
                <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Початок</label>
                            <input 
                              type="time" 
                              value={newRule.start_time}
                              onChange={e => setNewRule({...newRule, start_time: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-800 dark:text-gray-200"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Кінець</label>
                            <input 
                              type="time" 
                              value={newRule.end_time}
                              onChange={e => setNewRule({...newRule, end_time: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-800 dark:text-gray-200"
                            />
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Дні тижня</label>
                        <div className="flex gap-2 flex-wrap">
                            {allDays.map(day => (
                                <button
                                  key={day}
                                  onClick={() => toggleDay(day)}
                                  className={`px-3 py-1 rounded text-sm font-bold transition ${newRule.days.includes(day) ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Режим</label>
                        <select 
                          value={newRule.mode}
                          onChange={e => setNewRule({...newRule, mode: e.target.value})}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-800 dark:text-gray-200"
                        >
                            <option value="Провітрювання">Провітрювання</option>
                            <option value="Відкрито">Відкрито</option>
                            <option value="Закрито">Закрито</option>
                        </select>
                    </div>
                    <button 
                      onClick={handleAddRule}
                      className="w-full py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded transition"
                    >
                        Зберегти правило
                    </button>
                </div>
            )}

            <div className="space-y-3">
                {rules.length === 0 && !isAddingRule ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-4">Немає збережених правил.</p>
                ) : rules.map(rule => (
                  <div key={rule.id} className={`flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg border-l-4 ${rule.is_active ? 'border-l-blue-500' : 'border-l-gray-300 dark:border-l-gray-600 opacity-70'} border-y border-r border-gray-200 dark:border-gray-700 shadow-sm`}>
                      <div>
                          <div className={`font-black text-xl tracking-tight ${rule.is_active ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                              {rule.start_time} - {rule.end_time}
                          </div>
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                              {rule.days.map(d => (
                                  <span key={d} className={`text-[11px] font-bold px-2 py-0.5 rounded shadow-sm ${rule.is_active ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>{d}</span>
                              ))}
                          </div>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                          <span className={`font-bold text-xs px-2 py-1 rounded border ${rule.is_active ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800' : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}>
                              Режим: {rule.mode}
                          </span>
                          <div className="flex items-center gap-3">
                              <button onClick={() => deleteRule(rule.id)} className="text-red-500 hover:text-red-700 font-bold text-sm">Видалити</button>
                              <div onClick={() => toggleRule(rule.id, rule.is_active)} className={`w-11 h-6 rounded-full relative cursor-pointer shadow-inner transition-colors ${rule.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${rule.is_active ? 'right-1' : 'left-1'}`}></div>
                              </div>
                          </div>
                      </div>
                  </div>
                ))}
            </div>
        </div>

        {/* БЛОК 2: Погодний моніторинг */}
        <div className="p-5 bg-gradient-to-br from-sky-50 to-blue-100 dark:from-slate-800 dark:to-slate-700 rounded-xl border border-blue-200 dark:border-slate-600 relative overflow-hidden shadow-md">
            <h3 className="text-lg font-bold text-sky-900 dark:text-sky-100 mb-4 flex items-center gap-2">
                🌤️ Погодний моніторинг (Полтава)
            </h3>
            
            {weather.isLoading ? (
                <div className="text-center py-4 text-sky-800 dark:text-sky-200 font-bold animate-pulse">
                    Оновлення даних з супутника...
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-3 gap-4 mb-5">
                        <div className="bg-white/90 dark:bg-gray-900/60 p-3 rounded-xl text-center shadow-sm border border-white/50 dark:border-gray-700/50 backdrop-blur-sm">
                            <div className="text-2xl mb-1">💨</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Вітер</div>
                            <div className="font-black text-gray-800 dark:text-gray-200 text-xl">{weather.wind} <span className="text-sm font-medium text-gray-500">м/с</span></div>
                        </div>
                        <div className="bg-white/90 dark:bg-gray-900/60 p-3 rounded-xl text-center shadow-sm border border-white/50 dark:border-gray-700/50 backdrop-blur-sm">
                            <div className="text-2xl mb-1">💧</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Вологість</div>
                            <div className="font-black text-gray-800 dark:text-gray-200 text-xl">{weather.humidity}<span className="text-sm font-medium text-gray-500">%</span></div>
                        </div>
                        <div className={`bg-white/90 dark:bg-gray-900/60 p-3 rounded-xl text-center shadow-sm backdrop-blur-sm relative overflow-hidden ${weather.precipitation > 0 ? 'border border-red-200 dark:border-red-900/50' : 'border border-white/50 dark:border-gray-700/50'}`}>
                            {weather.precipitation > 0 && <div className="absolute inset-0 bg-red-500/5 dark:bg-red-500/10 animate-pulse"></div>}
                            <div className="text-2xl mb-1 relative z-10">{weather.precipitation > 0 ? '🌧️' : '☀️'}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1 relative z-10">Опади</div>
                            <div className={`font-black text-xl relative z-10 ${weather.precipitation > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                {weather.precipitation}<span className="text-sm font-medium opacity-70"> мм</span>
                            </div>
                        </div>
                    </div>
                    
                    {weather.isWarning && (
                        <div className="bg-red-100/90 dark:bg-red-900/80 text-red-800 dark:text-red-100 p-4 rounded-xl text-sm flex items-start gap-3 border border-red-300 dark:border-red-600 shadow-sm backdrop-blur-md">
                            <span className="text-2xl drop-shadow-sm">⚠️</span>
                            <div>
                                <div className="uppercase tracking-wider text-[11px] font-black mb-1 text-red-700 dark:text-red-300">Превентивне попередження</div>
                                <span className="font-medium">Висока ймовірність опадів або сильний вітер! Рекомендується зачинити вікна.</span>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>

      </div>
    </div>
  );
};