import React, { useState, useMemo, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { parseDateForSorting } from '../../utils/dateUtils';

const BlockTimetable = React.forwardRef(({ allData, favorites, toggleFavorite, selectedEvent, openContentPopup, translations, language, isFavoritesView = false, isFriendsView = false, friendsFavorites = new Set(), isExportMode = false }, ref) => {
    const [selectedDay, setSelectedDay] = useState(null);

    const sourceData = useMemo(() => {
        if (isFavoritesView) return allData.filter(p => favorites.has(p.id));
        if (isFriendsView) return allData.filter(p => friendsFavorites.has(p.id));
        return allData;
    }, [isFavoritesView, isFriendsView, allData, favorites, friendsFavorites]);

    const eventPerformances = useMemo(() =>
        (isFavoritesView || isFriendsView) ? sourceData : sourceData.filter(p => p.event === selectedEvent),
        [isFavoritesView, isFriendsView, sourceData, selectedEvent]
    );

    const availableDays = useMemo(() =>
        [...new Set(eventPerformances.map(p => p.date).filter(Boolean))]
        .sort((a, b) => parseDateForSorting(a) - parseDateForSorting(b)),
        [eventPerformances]
    );

    useEffect(() => {
        if (!availableDays.includes(selectedDay)) {
            setSelectedDay(availableDays[0] || null);
        }
    }, [selectedEvent, availableDays, selectedDay, isFavoritesView, isFriendsView]);

    const gridData = useMemo(() => {
        if (!selectedDay) return { locations: [], timeSlots: [], grid: {} };

        const dayPerformances = eventPerformances.filter(p => p.date === selectedDay);
        if (dayPerformances.length === 0) return { locations: [], timeSlots: [], grid: {} };

        const locations = [...new Set(dayPerformances.map(p => p.location).filter(Boolean))].sort();

        let minTime = 23.5, maxTime = 0;
        dayPerformances.forEach(p => {
            if (!p.time) return;
            const [h, m] = p.time.split(':').map(Number);
            const timeVal = h + m / 60;
            if (timeVal < minTime) minTime = timeVal;
            if (timeVal > maxTime) maxTime = timeVal;
        });

        const startTime = Math.floor(minTime);
        const endTime = Math.ceil(maxTime) + 1;
        const timeSlots = [];
        for (let h = startTime; h < endTime; h++) {
            timeSlots.push(`${String(h).padStart(2, '0')}:00`);
            timeSlots.push(`${String(h).padStart(2, '0')}:30`);
        }

        const grid = {};
        locations.forEach(loc => {
            grid[loc] = {};
            timeSlots.forEach(slot => { grid[loc][slot] = null; });
        });

        dayPerformances.forEach(p => {
            if (grid[p.location] && p.time) {
                const [h, m] = p.time.split(':').map(Number);
                const timeSlot = `${String(h).padStart(2, '0')}:${m < 30 ? '00' : '30'}`;
                if (grid[p.location][timeSlot] === null) {
                    grid[p.location][timeSlot] = p;
                }
            }
        });

        return { locations, timeSlots, grid };
    }, [selectedDay, eventPerformances]);

    if (!isFavoritesView && !isFriendsView && !selectedEvent) {
        return <div className="text-center text-white p-4">{translations[language].common.chooseCity}</div>
    }

    const renderCell = (performance) => {
        if (!performance) return null;

        const isCancelled = performance.crowdLevel?.toLowerCase() === 'geannuleerd' || performance.crowdLevel?.toLowerCase() === 'cancelled';
        const isFull = performance.crowdLevel?.toLowerCase() === 'vol' || performance.crowdLevel?.toLowerCase() === 'full';
        const isFavorite = favorites.has(performance.id);
        const fullTitle = performance.artist ? `${performance.artist} - ${performance.title}` : performance.title;

        let cellBgClass = isExportMode ? 'bg-[#2e9aaa]' : 'bg-[#1a5b64] hover:bg-[#2e9aaa]';
        let content = <>{fullTitle}</>;

        if (isCancelled) {
            cellBgClass = 'bg-gray-500 opacity-80';
            content = (
                <>
                    <span className="line-through">{fullTitle}</span>
                    <span className="block text-xs font-bold mt-1">{translations[language].common.geannuleerd}</span>
                </>
            );
        } else if (isFull) {
            cellBgClass = 'bg-red-500';
            content = (
                <>
                    <span>{fullTitle}</span>
                    <span className="block text-xs font-bold mt-1">{translations[language].common.vol}</span>
                </>
            );
        }

        return (
            <div
                onClick={() => !isCancelled && !isExportMode && openContentPopup('performance', performance)}
                className={`relative text-white text-xs p-2 rounded-md w-full h-full flex flex-col items-center justify-center text-center transition-colors ${!isCancelled && !isExportMode ? 'cursor-pointer' : ''} ${cellBgClass}`}
            >
                <div className="w-full pr-6">
                    {content}
                </div>
                {!isCancelled && !isFriendsView && (
                    <div
                        onClick={(e) => { if (!isExportMode) { e.stopPropagation(); toggleFavorite(performance, e); } }}
                        className={`absolute top-1 right-1 p-1 ${!isExportMode ? 'cursor-pointer' : 'pointer-events-none'}`}
                        title={!isExportMode ? (isFavorite ? translations[language].common.removeFromFavorites : translations[language].common.addToFavorites) : ''}
                    >
                        <Heart className={`h-5 w-5 ${isFavorite ? 'text-red-500' : 'text-white/70'}`} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={2} />
                    </div>
                )}
            </div>
        );
    };

    const getEmptyMessage = () => {
      if (isFavoritesView) return translations[language].common.noFavoritesFound;
      if (isFriendsView) return translations[language].common.noFriendsFavoritesFound;
      return translations[language].common.noDataFound.replace('%s', selectedEvent);
    }

    const headerBaseClasses = "p-2 font-bold bg-[#20747f] z-10";
    const timeHeaderClasses = `${headerBaseClasses} text-center border-b border-white/20 ${!isExportMode ? 'sticky top-0' : ''}`;
    const locationHeaderClasses = `${headerBaseClasses} text-right pr-2 border-r border-white/20 flex items-center justify-end ${!isExportMode ? 'sticky left-0' : ''}`;
    const cornerCellClasses = `${headerBaseClasses} ${!isExportMode ? 'sticky top-0 left-0' : ''} z-20`;

    return (
        <div ref={ref} className="w-full text-white">
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 mb-8 p-3 bg-white bg-opacity-20 rounded-xl shadow-lg max-w-full overflow-x-auto scrollbar-hide">
                {availableDays.length > 0 ? availableDays.map(day => (
                    <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${selectedDay === day ? 'bg-[#78b5e3] text-black shadow-md' : 'bg-white bg-opacity-30 text-gray-100 hover:bg-opacity-50'}`}
                    >
                        {day}
                    </button>
                )) : <p>{getEmptyMessage()}</p>}
            </div>

            <div className={`transition-opacity duration-300 ${!selectedDay ? 'opacity-0' : 'opacity-100'}`}>
                {availableDays.length > 0 && selectedDay && (
                    <div className={`overflow-x-auto ${isExportMode ? 'bg-[#20747f]' : 'bg-black bg-opacity-20'} p-4 rounded-lg`}>
                        <div className="inline-grid gap-px" style={{ gridTemplateColumns: `100px repeat(${gridData.timeSlots.length}, 120px)` }}>
                            <div className={cornerCellClasses}></div>
                            {gridData.timeSlots.map(time => (
                                <div key={time} className={timeHeaderClasses}>
                                    {time}
                                </div>
                            ))}
                            {gridData.locations.map((loc, locIndex) => (
                                <React.Fragment key={loc}>
                                    <div className={locationHeaderClasses} style={{ gridRow: locIndex + 2 }}>
                                        <span>{loc}</span>
                                    </div>
                                    {gridData.timeSlots.map(time => {
                                        const performance = gridData.grid[loc]?.[time];
                                        return (
                                            <div key={`${loc}-${time}`} className="border-r border-b border-white/10 p-1 min-h-[60px] flex items-center justify-center">
                                                {renderCell(performance)}
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export default BlockTimetable;
