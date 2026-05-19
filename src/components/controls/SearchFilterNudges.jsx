import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import SearchBar from './SearchBar';
import GenreFilterDropdown from './GenreFilterDropdown';
import IconFilterDropdown from './IconFilterDropdown';

const SearchFilterNudges = ({
    searchTerm,
    setSearchTerm,
    genreFilters,
    setGenreFilters,
    allGenres,
    iconFilters,
    setIconFilters,
    filterScope,
    setFilterScope,
    safetyIcons,
    language,
    translations
}) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const nudgeRef = useRef(null);

    const toggleSearch = () => {
        setIsSearchOpen(prev => !prev);
        if (isFilterOpen) setIsFilterOpen(false);
    };

    const toggleFilter = () => {
        setIsFilterOpen(prev => !prev);
        if (isSearchOpen) setIsSearchOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (nudgeRef.current && !nudgeRef.current.contains(event.target)) {
                setIsSearchOpen(false);
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    return (
        <div
            ref={nudgeRef}
            className={`fixed top-1/2 right-0 transform -translate-y-1/2 z-50 flex items-center ${!isSearchOpen && !isFilterOpen ? 'pointer-events-none' : 'pointer-events-auto'}`}
        >
             <div className={`relative transition-all duration-300 ease-in-out w-80 h-[28rem] rounded-l-lg shadow-xl mr-[-1px] ${isSearchOpen || isFilterOpen ? 'translate-x-0 opacity-100 bg-[#1a5b64]' : 'translate-x-full opacity-0 bg-transparent'}`}>
                <div className={`absolute inset-0 p-4 text-white transition-opacity duration-300 pointer-events-none ${isSearchOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}>
                    <h1 className="font-bold text-lg mb-4">{translations[language].common.searchPlaceholder.split('...')[0]}</h1>
                    <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} translations={translations} language={language} />
                </div>

                 <div className={`absolute inset-0 p-4 text-white transition-opacity duration-300 pointer-events-none ${isFilterOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}>
                    <h1 className="font-bold text-lg mb-4">{translations[language].common.filterByIcon.split('...')[0]}</h1>
                    <div className="space-y-4 relative">
                        <GenreFilterDropdown
                             genreFilters={genreFilters}
                             setGenreFilters={setGenreFilters}
                             allGenres={allGenres}
                             language={language}
                             translations={translations}
                        />
                        <IconFilterDropdown
                            iconFilters={iconFilters}
                            setIconFilters={setIconFilters}
                            filterScope={filterScope}
                            setFilterScope={setFilterScope}
                            safetyIcons={safetyIcons}
                            language={language}
                            translations={translations}
                        />
                    </div>
                </div>
            </div>
            <div className="flex flex-col space-y-2 pointer-events-auto">
                 <button
                    onClick={toggleSearch}
                    className={`w-14 h-14 bg-[#2e9aaa] rounded-l-full shadow-lg flex items-center justify-center hover:bg-[#20747f] transition-colors focus:outline-none pr-3 ${isSearchOpen ? 'bg-[#20747f]' : ''}`}
                    aria-label="Zoeken"
                    aria-expanded={isSearchOpen}
                >
                    <Search className="h-7 w-7 text-white" />
                </button>
                 <button
                    onClick={toggleFilter}
                    className={`w-14 h-14 bg-[#2e9aaa] rounded-l-full shadow-lg flex items-center justify-center hover:bg-[#20747f] transition-colors focus:outline-none pr-3 ${isFilterOpen ? 'bg-[#20747f]' : ''}`}
                    aria-label="Filteren"
                    aria-expanded={isFilterOpen}
                >
                    <Filter className="h-7 w-7 text-white" />
                </button>
            </div>
        </div>
    );
};

export default SearchFilterNudges;
