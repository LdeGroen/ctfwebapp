import React from 'react';

const EventViewSwitcher = ({ viewMode, setViewMode, language, translations, handleAnimatedUpdate, hasRoutes, onOpenRoutes }) => (
  <div className="flex flex-wrap justify-center gap-4 my-8">
    <button
      onClick={() => handleAnimatedUpdate(() => setViewMode('card'))}
      className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${viewMode === 'card' ? 'bg-[#78b5e3] text-black shadow-md' : 'bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50'}`}
    >
      {translations[language].common.cardView}
    </button>
    <button
      onClick={() => handleAnimatedUpdate(() => setViewMode('block'))}
      className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${viewMode === 'block' ? 'bg-[#78b5e3] text-black shadow-md' : 'bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50'}`}
    >
      {translations[language].common.blockTimetable}
    </button>
    {hasRoutes && (
        <button
          onClick={onOpenRoutes}
          className="px-6 py-3 rounded-lg font-semibold transition-all duration-200 bg-[#78b5e3] text-black shadow-md hover:bg-[#9f4493]"
        >
          {translations[language].common.routes}
        </button>
    )}
  </div>
);

export default EventViewSwitcher;
