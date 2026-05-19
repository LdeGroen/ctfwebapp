import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronDown } from 'lucide-react';

// ========= WIJZIGING: StickyHeader aangepast voor 'Open Call' navigatie =========
const StickyHeader = ({ isVisible, uniqueEvents, handleEventClick, handleFavoritesClick, handleFriendsFavoritesClick, handleMoreInfoClick, handleAccessibilityClick, hasFriendsFavorites, selectedEvent, currentView, language, handleLanguageChange, translations, onLogoClick, openContentPopup, isInitialLoad }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    let currentSelectionText = translations[language].common.chooseCity;
    if (currentView === 'favorites') currentSelectionText = translations[language].common.favorites;
    else if (currentView === 'friends-favorites') currentSelectionText = translations[language].common.friendsFavorites;
    else if (currentView === 'more-info') currentSelectionText = translations[language].common.moreInfo;
    else if (currentView === 'accessibility') currentSelectionText = translations[language].common.accessibility;
    else if (selectedEvent) currentSelectionText = selectedEvent;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsDropdownOpen(false);
        };
        if (isDropdownOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isDropdownOpen]);

    return (
        <div className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
            <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
                <div className="relative flex h-24 sm:h-20 items-end justify-center bg-black/20 backdrop-blur-md rounded-b-xl px-4 shadow-lg pb-2">
                    <div className="absolute left-4 bottom-2 flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4">
                       {isInitialLoad ? (
                           <img onClick={onLogoClick} className="h-16 w-auto cursor-pointer" src="https://media.cafetheaterfestival.nl/wp-content/uploads/2025/08/fav-wit-1.png" alt="Afbeelding van Café Theater Festival Logo"/>
                       ) : (
                           <button
                                onClick={onLogoClick}
                                className="px-4 py-2 rounded-lg font-semibold bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50 transition-colors duration-200 text-sm flex items-center gap-2"
                            >
                                <ChevronLeft className="h-5 w-5" />
                                {translations[language].common.back}
                           </button>
                       )}
                       <button
                            onClick={() => openContentPopup('iframe', 'https://stamgast.cafetheaterfestival.nl/')}
                            className="px-3 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm rounded-lg font-semibold bg-[#78b5e3] text-black hover:bg-[#9f4493] transition-colors duration-200"
                        >
                            <span className="hidden sm:inline">{translations[language].common.becomeRegularGuest}</span>
                            <span className="sm:hidden">{translations[language].common.becomeRegularGuestShort}</span>
                        </button>
                    </div>
                    <div className="flex items-center justify-center">
                        <div className="relative" ref={dropdownRef}>
                            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="inline-flex justify-center w-full rounded-md border border-gray-500 shadow-sm px-4 py-2 bg-white/30 text-sm font-medium text-white hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
                                {currentSelectionText}
                                <ChevronDown className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
                            </button>
                            {isDropdownOpen && (
                                <div className="origin-top-right absolute right-1/2 translate-x-1/2 mt-2 w-56 rounded-md shadow-lg bg-[#1a5b64] ring-1 ring-black ring-opacity-5 focus:outline-none">
                                    <div className="py-1" role="menu" aria-orientation="vertical">
                                        {uniqueEvents.map(event => (<button key={event} onClick={() => { handleEventClick(event); setIsDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#20747f] text-center" role="menuitem">{event}</button>))}
                                        <div className="border-t border-white/20 my-1"></div>
                                        <button onClick={() => { handleFavoritesClick(); setIsDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#20747f] text-center" role="menuitem">{translations[language].common.favorites}</button>
                                        {hasFriendsFavorites && <button onClick={() => { handleFriendsFavoritesClick(); setIsDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#20747f] text-center" role="menuitem">{translations[language].common.friendsFavorites}</button>}
                                        <div className="border-t border-white/20 my-1"></div>
                                        <button onClick={() => { handleMoreInfoClick(); setIsDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#20747f] text-center" role="menuitem">{translations[language].common.moreInfo}</button>
                                        <button onClick={() => { handleAccessibilityClick(); setIsDropdownOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#20747f] text-center" role="menuitem">{translations[language].common.accessibility}</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                     <div className="absolute right-4 bottom-2 flex items-center space-x-2">
                        <button onClick={handleLanguageChange} className="px-3 py-1 h-8 rounded-full bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50 transition-colors duration-200 text-xs font-semibold">{language === 'nl' ? 'EN' : 'NL'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StickyHeader;
