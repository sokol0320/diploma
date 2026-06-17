import React, { useState } from 'react';

export const DeviceSettingsModal = ({ isOpen, onClose, device, onUpdate }) => {
  const [deviceName, setDeviceName] = useState(device?.deviceName || '');
  const [side, setSide] = useState(() => {
    if (device?.side?.data && Array.isArray(device.side.data)) {
      return device.side.data[0];
    }
    return device?.side ?? 1;
  });
  const [tempSide, setTempSide] = useState(side);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSideSelect = (e) => {
    const val = parseInt(e.target.value, 10);
    setTempSide(val);
    if (val !== side) {
      setShowConfirm(true);
    } else {
      setShowConfirm(false);
    }
  };

  const confirmSideChange = () => {
    setSide(tempSide);
    setShowConfirm(false);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await fetch(`http://localhost:3306/devices/${device.guid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceName, side })
      });
      if(side == 1){
        await fetch('http://localhost:3306/device-command', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({guid: device.guid, "go": 'SET_LEFT'})
        })
      }
      if(side == 0){
        await fetch('http://localhost:3306/device-command', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({guid: device.guid, "go": 'SET_RIGHT'})
        })
      }
        
      onUpdate();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Ви впевнені, що хочете видалити цей пристрій?')) return;
    setIsLoading(true);
    try {
      await fetch(`http://localhost:3306/devices/${device.guid}`, {
        method: 'DELETE'
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Налаштування пристрою</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ім'я пристрою
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Орієнтація вікна
            </label>
            <select
              value={tempSide}
              onChange={handleSideSelect}
              className="w-full px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value={1}>Ліва</option>
              <option value={0}>Права</option>
            </select>
          </div>

          {showConfirm && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                Ви змінили орієнтацію. Підтвердіть зміну для застосування.
              </p>
              <button
                onClick={confirmSideChange}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold rounded-lg transition"
              >
                Підтвердити орієнтацію
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSave}
              disabled={isLoading || showConfirm}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition disabled:opacity-50"
            >
              Зберегти налаштування
            </button>
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="w-full py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50 font-bold rounded-lg transition"
            >
              Видалити пристрій
            </button>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 font-bold rounded-lg transition"
            >
              Скасувати
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};