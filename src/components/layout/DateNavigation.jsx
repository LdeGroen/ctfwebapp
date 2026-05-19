import React, { useMemo } from 'react';

const DateNavigation = ({ datesForCurrentSelectedEvent, selectedDate, setSelectedDate, setSearchTerm, translations, language, selectedEvent, timetableData }) => {
    const hasCalmRoutePerformances = useMemo(() =>
        timetableData.some(item => item.event === selectedEvent && item.isCalmRoute),
        [timetableData, selectedEvent]
    );

    // NIEUW: Check of Utrecht Centraal voorkomt in dit event
    const hasUtrechtCentraal = useMemo(() =>
        timetableData.some(item =>
            item.event === selectedEvent &&
            (item.location && item.location.toLowerCase().includes('utrecht centraal'))
        ),
        [timetableData, selectedEvent]
    );

    return (
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 mb-8 p-3 bg-white bg-opacity-20 rounded-xl shadow-lg max-w-full overflow-x-auto scrollbar-hide">
            <button onClick={() => { setSelectedDate('all-performances'); setSearchTerm(''); }} className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${selectedDate === 'all-performances' ? 'bg-[#78b5e3] text-black shadow-md' : 'bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50'}`}>{translations[language].common.allPerformances}</button>
            {datesForCurrentSelectedEvent.map(date => {
                // Check of alle voorstellingen op deze dag try-outs zijn
                const dayPerformances = timetableData.filter(item => item.event === selectedEvent && item.date === date);
                const isAllTryOuts = dayPerformances.length > 0 && dayPerformances.every(item => item.isTryOut);

                return (
                    <button key={date} onClick={() => { setSelectedDate(date); setSearchTerm(''); }} className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${selectedDate === date ? 'bg-[#78b5e3] text-black shadow-md' : 'bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50'}`}>
                        {date}{isAllTryOuts ? ' (try-outs)' : ''}
                    </button>
                );
            })}

            {/* NIEUW: Utrecht Centraal Button */}
            {hasUtrechtCentraal && (
                <button onClick={() => { setSelectedDate('utrecht-centraal'); setSearchTerm(''); }} className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${selectedDate === 'utrecht-centraal' ? 'bg-[#78b5e3] text-black shadow-md' : 'bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50'}`}>
                    {translations[language].common.utrechtCentraal}
                </button>
            )}

            {hasCalmRoutePerformances && (<button onClick={() => { setSelectedDate('calm-route'); setSearchTerm(''); }} className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${selectedDate === 'calm-route' ? 'bg-[#78b5e3] text-black shadow-md' : 'bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50'}`}>{translations[language].common.calmRoute}</button>)}
        </div>
    );
};

export default DateNavigation;
