import React from 'react';

const SearchBar = ({ searchTerm, setSearchTerm, translations, language }) => (
  <div className="w-full max-w-md mx-auto">
    <input type="text" placeholder={translations[language].common.searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-3 rounded-lg border-2 border-gray-300 focus:border-[#1a5b64] focus:ring focus:ring-[#1a5b64] focus:ring-opacity-50 text-gray-800 shadow-md"/>
  </div>
);

export default SearchBar;
