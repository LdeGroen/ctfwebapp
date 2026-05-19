import React from 'react';
import PerformanceCard from './PerformanceCard';

const TimetableDisplay = React.forwardRef(({
  loading, error, displayedData, currentView, favorites, toggleFavorite,
  addToGoogleCalendar, openContentPopup, language, handleIconMouseEnter, handleIconMouseLeave, translations,
  selectedEvent, searchTerm, showMessageBox, selectedDate, safetyIcons, isExportMode = false,
  iconFilters, genreFilters, onNavigate,
  onReservationClick // <--- 1. Zorg dat deze hier staat
}, ref) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white bg-opacity-20 rounded-xl shadow-lg animate-pulse">
        <div className="w-16 h-16 border-4 border-t-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-xl font-semibold">{translations[language].common.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500 bg-opacity-70 text-white p-4 rounded-xl shadow-lg text-center font-semibold max-w-lg">
        <p className="mb-2">{translations[language].common.errorOops}</p>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 bg-red-700 hover:bg-red-800 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
        >
          {translations[language].common.tryAgain}
        </button>
      </div>
    );
  }

  if (displayedData.length === 0) {
    const filtersAreActive = (iconFilters && iconFilters.size > 0) || (genreFilters && genreFilters.size > 0);
    let message;
    if (searchTerm) {
        message = translations[language].common.noSearchResults.replace('%s', `'${searchTerm}'`);
    } else if (currentView === 'favorites') {
        message = translations[language].common.noFavoritesFound;
    } else if (currentView === 'friends-favorites') {
        message = translations[language].common.noFriendsFavoritesFound;
    } else if (filtersAreActive) {
        message = translations[language].common.noFilterResultsForEvent;
    } else {
        message = translations[language].common.noDataFound.replace('%s', (selectedEvent || ''));
    }

    return (
      <div className="bg-white bg-opacity-20 p-6 rounded-xl shadow-lg text-center font-semibold">
        <p>{message}</p>
      </div>
    );
  }

  const isAllPerformancesView = selectedDate === 'all-performances';
  const isFriendsView = currentView === 'friends-favorites';

  return (
    <div ref={ref} className="w-full max-w-6xl mx-auto">
      {displayedData.map((group, index) => (
        <div key={index} className="mb-8">
          {group.groupTitle && (
            <h2 className="text-2xl font-bold text-white mb-6 text-center drop_shadow-lg">
              {group.groupTitle}
            </h2>
          )}
          {group.subGroups.map((subGroup, subIndex) => (
            <div key={subIndex} className="mb-8 last:mb-0">
              {subGroup.subGroupTitle && (
                <h2 className="text-xl font-semibold text-white mb-4 text-center drop_shadow">
                  {subGroup.subGroupTitle}
                </h2>
              )}
              <div
                className={`grid grid-cols-1 md:grid-cols-2 ${
                  subGroup.items.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'
                } gap-6 justify-items-center justify-center`}
              >
                {subGroup.items.map((item) => (
                  <PerformanceCard
                    key={item.id}
                    item={item}
                    favorites={favorites}
                    toggleFavorite={toggleFavorite}
                    addToGoogleCalendar={addToGoogleCalendar}
                    openContentPopup={openContentPopup}
                    language={language}
                    handleIconMouseEnter={handleIconMouseEnter}
                    handleIconMouseLeave={handleIconMouseLeave}
                    translations={translations}
                    showMessageBox={showMessageBox}
                    safetyIcons={safetyIcons}
                    hideTime={isAllPerformancesView}
                    isExportMode={isExportMode}
                    isFriendsView={isFriendsView}
                    onNavigate={onNavigate}
                    isNavigable={isAllPerformancesView}
                    onReservationClick={onReservationClick} // <--- 2. Zorg dat hij hier wordt doorgegeven
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
});

export default TimetableDisplay;
