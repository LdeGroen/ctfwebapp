import React from 'react';

const TopRightControls = ({ language, handleLanguageChange, translations }) => (
    <div className="absolute top-12 right-4 z-10 flex flex-row items-center space-x-2">
        <button onClick={handleLanguageChange} className="px-3 py-1 h-8 sm:h-10 rounded-full bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50 transition-colors duration-200 text-sm font-semibold">
            {language === 'nl' ? 'EN' : 'NL'}
        </button>
    </div>
);

export default TopRightControls;
