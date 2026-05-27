import { useState, useEffect } from 'react';

export const ThemeToggle = () => {
    // 1. Ініціалізація стану з localStorage або системних налаштувань
    const [isDark, setIsDark] = useState(() => {
        const savedTheme = localStorage.getItem('app_theme');
        if (savedTheme) {
            return savedTheme === 'dark';
        }
        // Якщо немає збереженої, перевіряємо тему системи
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    // 2. Додаємо/видаляємо клас 'dark' на тегу <html>
    useEffect(() => {
        const root = window.document.getElementById('main');
        if (isDark) {
            root.classList.add('dark');
            localStorage.setItem('app_theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('app_theme', 'light');
        }
    }, [isDark]);

    return (
        <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-yellow-400 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-300 shadow-sm"
            aria-label="Перемкнути тему"
        >
            {isDark ? (
                // Іконка МІСЯЦЯ (Темна тема)
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                </svg>
            ) : (
                // Іконка СОНЦЯ (Світла тема)
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 2.32a1 1 0 011.415 0l.707.707a1 1 0 01-1.414 1.415l-.707-.707a1 1 0 010-1.415zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM15.636 15.636a1 1 0 010 1.415l-.707.707a1 1 0 01-1.415-1.414l.707-.707a1 1 0 011.415 0zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-4.22-2.32a1 1 0 01-1.415 0l-.707-.707a1 1 0 011.414-1.415l.707.707a1 1 0 010 1.415zM4 10a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zM6.343 6.343a1 1 0 010-1.415l-.707-.707a1 1 0 01-1.414 1.415l.707.707a1 1 0 011.415 0zM10 5a5 5 0 100 10 5 5 0 000-10z" clipRule="evenodd"></path>
                </svg>
            )}
        </button>
    );
};
