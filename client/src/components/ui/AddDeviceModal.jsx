import React, { useState, useEffect } from 'react';
import { SideToggle } from './toggles/SideToggle';


export const AddDeviceModal = ({ isOpen, onClose, onDeviceAdded, user, Customfetch }) => {
    const [guid, setGuid] = useState('');
    const [deviceName, setDeviceName] = useState('');
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [side, setLeft] = useState(true);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg('');

    const ownerId = typeof user === 'object' ? user.id : user;
    if (!ownerId) {
        setError('Помилка: не вдалося визначити ID користувача');
        return;
    }

    try {
        const response = await fetch('https://d2nxohjr4o1avk.cloudfront.net/api/add-device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                guid,
                ownerId,
                deviceName,
                side: side ? 1 : 0,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Помилка при додаванні пристрою');
        }

        
        setSuccessMsg('Пристрій успішно додано!');

        if (Customfetch) Customfetch(); 
        if (onDeviceAdded) onDeviceAdded(data.device);


        setGuid('');
        setDeviceName('');


        setTimeout(() => {
            onClose();
            setSuccessMsg('');
        }, 1500);

    } catch (err) {
        setError(err.message);
    }
};
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity">
            {/* Додано dark:bg-gray-800 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6 relative transition-colors duration-300">
                
                {/* Додано dark:text-gray-100 */}
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 transition-colors duration-300">
                    Додати новий пристрій
                </h2>
                
                {error && (
                    <div className="mb-4 p-3 text-sm text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-md transition-colors duration-300">
                        {error}
                    </div>
                )}
                {successMsg && (
                    <div className="mb-4 p-3 text-sm text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-md transition-colors duration-300">
                        {successMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-300">
                            GUID пристрою: *
                        </label>
                        {/* Додано темні стилі для інпуту (фон, рамка, текст) */}
                        <input
                            type="text"
                            value={guid}
                            onChange={(e) => setGuid(e.target.value)}
                            required
                            placeholder="Наприклад: NgpA-22s7-189p-34vW"
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors placeholder-gray-400 dark:placeholder-gray-400"
                        />
                    </div>
                    
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-300">
                            Назва пристрою (необов'язково):
                        </label>
                        {/* Додано темні стилі для інпуту */}
                        <input
                            type="text"
                            value={deviceName}
                            onChange={(e) => setDeviceName(e.target.value)}
                            placeholder="Наприклад: test"
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors placeholder-gray-400 dark:placeholder-gray-400"
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-300">
                            Сторона
                        </label>
                        <SideToggle side={side} setSide={setLeft}/>
                    </div>
                    <div className="flex justify-end space-x-3">
                        {/* Кнопка скасувати - темні стилі */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 transition-colors"
                        >
                            Скасувати
                        </button>
                        {/* Кнопка додати */}
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 dark:focus:ring-offset-gray-800 transition-colors"
                        >
                            Додати
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
