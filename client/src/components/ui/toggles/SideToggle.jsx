import React from "react";
export const SideToggle = ({side,  setSide }) => {
  return (
   <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 transition-colors duration-300">
            <button
            type="button"
            onClick={() => setSide(true)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
            side === true
            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            >
            Лівий (Left)
            </button>
            <button
                type="button"
                onClick={() => setSide(false)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                side === false
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
                Правий (Right)
            </button>
    </div>
    
  );
};

