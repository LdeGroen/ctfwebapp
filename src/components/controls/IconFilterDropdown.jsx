import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

const IconFilterDropdown = ({
  iconFilters,
  setIconFilters,
  filterScope,
  setFilterScope,
  safetyIcons,
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

  const handleFilterChange = (iconKey) => {
    setIconFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(iconKey)) {
        newFilters.delete(iconKey);
      } else {
        newFilters.add(iconKey);
      }
      return newFilters;
    });
  };

  const selectedCount = iconFilters.size;

  return (
    <div className="w-full">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 rounded-lg bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50 transition-colors duration-200 flex justify-between items-center text-left"
      >
        <span className="truncate">
          {selectedCount > 0
            ? `${selectedCount} filter${selectedCount > 1 ? 's' : ''} actief`
            : translations[language].common.filterByIcon}
        </span>
        <ChevronDown className={`h-5 w-5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div ref={menuRef} className="absolute top-full left-0 w-full mt-2 bg-[#1a5b64] text-white rounded-lg shadow-xl z-20 p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold">{translations[language].common.filterScopeLabel}:</span>
            <div className="flex items-center bg-white/20 rounded-full p-1">
              <button onClick={() => setFilterScope('current')} className={`px-3 py-1 text-sm rounded-full ${filterScope === 'current' ? 'bg-[#2e9aaa]' : ''}`}>{translations[language].common.filterScopeThisEvent}</button>
              <button onClick={() => setFilterScope('all')} className={`px-3 py-1 text-sm rounded-full ${filterScope === 'all' ? 'bg-[#2e9aaa]' : ''}`}>{translations[language].common.filterScopeAllEvents}</button>
            </div>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {safetyIcons.map(icon => (
              <label key={icon.key} className="flex items-center space-x-3 cursor-pointer p-2 hover:bg-white/10 rounded-md">
                <input
                  type="checkbox"
                  checked={iconFilters.has(icon.key)}
                  onChange={() => handleFilterChange(icon.key)}
                  className="h-5 w-5 rounded bg-white/30 text-[#2e9aaa] focus:ring-0"
                />
                <img src={icon.url} alt={icon.label} className="h-6 w-auto" />
                <span>{icon.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IconFilterDropdown;
