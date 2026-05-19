import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

const GenreFilterDropdown = ({
  genreFilters,
  setGenreFilters,
  allGenres,
  language,
  translations
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target) &&
        menuRef.current && !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleFilterChange = (genreKey) => {
    setGenreFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(genreKey)) {
        newFilters.delete(genreKey);
      } else {
        newFilters.add(genreKey);
      }
      return newFilters;
    });
  };

  const selectedCount = genreFilters.size;

  return (
    <div className="w-full">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 rounded-lg bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50 transition-colors duration-200 flex justify-between items-center text-left"
      >
        <span className="truncate">
          {selectedCount > 0
            ? `${selectedCount} genre${selectedCount > 1 ? 's' : ''} geselecteerd`
            : translations[language].common.filterByGenre}
        </span>
        <ChevronDown className={`h-5 w-5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div ref={menuRef} className="absolute top-full left-0 w-full mt-2 bg-[#1a5b64] text-white rounded-lg shadow-xl z-20 p-4">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {allGenres.map(genre => (
              <label key={genre.key} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-white/10 rounded-md">
                <input
                  type="checkbox"
                  checked={genreFilters.has(genre.key)}
                  onChange={() => handleFilterChange(genre.key)}
                  className="h-5 w-5 rounded bg-white/30 text-[#2e9aaa] focus:ring-0"
                />
                <span>{genre.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GenreFilterDropdown;
