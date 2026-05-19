import React, { useState, useMemo, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { getSafetyIcons } from '../../utils/icons';
import { parseDateForSorting } from '../../utils/dateUtils';
import { applyFormatting } from '../../utils/textRenderers';
import RecommendationCard from '../performance/RecommendationCard';

const PerformanceDetailPopup = ({ item, language, translations, allPerformances, openContentPopup, onReservationClick }) => {
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const safetyIcons = useMemo(() => getSafetyIcons(translations, language), [language, translations]);

    const title = item.artist ? `${item.artist} - ${item.title}` : item.title;
    const credits = language === 'nl' ? item.marketingCredits : (item.marketingCreditsENG || item.marketingCredits);
    const textAboutPerformance = language === 'nl' ? item.marketingVoorstellingNL : item.marketingVoorstellingENG;
    const textAboutMakers = language === 'nl' ? item.marketingBioNL : item.marketingBioENG;
    const image1 = item.marketingAfbeelding1;

    const translatedGenre = useMemo(() => {
        const genres = (item.genre && item.genre !== 'N/A') ? item.genre.split(',').map(g => g.trim()) : [];
        const subgenres = Array.isArray(item.subgenre) ? item.subgenre : [];
        const allTags = [...genres, ...subgenres];
        if (allTags.length === 0) return null;
        const translated = allTags.map(g => translations[language]?.genres?.[g] || g);
        return translated.join(' / ');
    }, [item.genre, item.subgenre, language, translations]);

    const performanceOccurrences = useMemo(() => {
        return allPerformances
            .filter(p => p.artist === item.artist && p.title === item.title)
            .sort((a, b) => {
                const dateA = parseDateForSorting(a.date);
                const dateB = parseDateForSorting(b.date);
                if (dateA - dateB !== 0) return dateA - dateB;
                return a.time.localeCompare(b.time);
            });
    }, [allPerformances, item.artist, item.title]);

    const renderTextWithLineBreaks = (text) => {
        if (!text) return null;
        return text.split('\n').map((line, index) => (
            <p key={index} className="mb-2" dangerouslySetInnerHTML={{ __html: applyFormatting(line) }}></p>
        ));
    };

    const findPerformance = useCallback((performanceId, eventName) => {
        return allPerformances.find(p => p.originalPerformanceId === performanceId && p.event === eventName);
    }, [allPerformances]);

    const similarItem = useMemo(() => {
        if (!item.similarRaw || !item.eventId) return null;
        const matchString = item.similarRaw.find(str => str.includes(item.eventId));
        if (!matchString) return null;
        let targetPerformanceId;
        if (matchString.includes('|')) { targetPerformanceId = matchString.split('|')[1]; }
        else if (matchString.includes(':')) { targetPerformanceId = matchString.split(':')[1]; }
        else { targetPerformanceId = matchString; }
        return findPerformance(targetPerformanceId ? targetPerformanceId.trim() : null, item.event);
    }, [item.similarRaw, item.eventId, item.event, findPerformance]);

    const differentItem = useMemo(() => {
        if (!item.differentRaw || !item.eventId) return null;
        const matchString = item.differentRaw.find(str => str.includes(item.eventId));
        if (!matchString) return null;
        let targetPerformanceId;
        if (matchString.includes('|')) { targetPerformanceId = matchString.split('|')[1]; }
        else if (matchString.includes(':')) { targetPerformanceId = matchString.split(':')[1]; }
        else { targetPerformanceId = matchString; }
        return findPerformance(targetPerformanceId ? targetPerformanceId.trim() : null, item.event);
    }, [item.differentRaw, item.eventId, item.event, findPerformance]);

    const nearbyItem = useMemo(() => {
        if (!item.nearbyLocationId) return null;
        return allPerformances.find(p =>
            p.locationId === item.nearbyLocationId &&
            p.event === item.event &&
            p.originalPerformanceId !== item.originalPerformanceId
        );
    }, [item.nearbyLocationId, item.event, item.originalPerformanceId, allPerformances]);

    return (
        <div className="overflow-y-auto flex-grow p-4 sm:p-6 text-white">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-center">{title}</h2>

            <div className="max-w-2xl mx-auto my-4 p-3 bg-[#78b5e3] rounded-lg text-black">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsScheduleOpen(!isScheduleOpen)}>
                    <h3 className="text-lg font-semibold">{translations[language].common.performanceSchedule}</h3>
                    <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isScheduleOpen ? 'rotate-180' : ''}`} />
                </div>
                {isScheduleOpen && (
                    <ul className="space-y-1 mt-3 animate-fade-in">
                        {performanceOccurrences.map(occ => (
                            <li key={occ.id} className="flex flex-wrap justify-between items-center text-base py-1">
                                <span>{occ.event} - {occ.location}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-right">{occ.date} - {occ.time}</span>
                                    {occ.isReservable && (
                                        <button onClick={(e) => { e.stopPropagation(); onReservationClick(occ); }} className="px-2 py-1 bg-[#9f4493] text-white rounded shadow-md hover:bg-[#7a3471] text-xs font-semibold transition-colors">
                                            {translations[language].common.reserve}
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-4 my-6 max-w-5xl mx-auto">
                <div className="md:w-1/3 text-left md:text-right">
                    <h3 className="text-xl font-semibold mb-2 border-b-2 border-white/50 pb-1">{translations[language].common.aboutShow}</h3>
                    <div className="prose prose-sm prose-invert max-w-none">{renderTextWithLineBreaks(textAboutPerformance)}</div>
                </div>
                {image1 && (
                    <div className="md:w-1/3">
                        <img src={image1} alt={`Afbeelding van ${title}`} className="rounded-lg shadow-lg w-full h-auto object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                )}
                <div className="md:w-1/3 text-left">
                    <h3 className="text-xl font-semibold mb-2 border-b-2 border-white/50 pb-1">{translations[language].common.aboutCreators}</h3>
                    <div className="prose prose-sm prose-invert max-w-none">{renderTextWithLineBreaks(textAboutMakers)}</div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto my-4 p-3 bg-[#78b5e3] rounded-lg text-black">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                    {translatedGenre && <h3 className="text-base"><span className="font-bold">Genre:</span> {translatedGenre}</h3>}
                    <div className="flex flex-row flex-wrap justify-center items-center gap-2">
                        {safetyIcons.map(icon => item.safetyInfo[icon.key] && (
                            <img key={icon.key} src={icon.url} alt={icon.label} title={icon.tooltip} className="h-7 w-auto"/>
                        ))}
                    </div>
                </div>
            </div>

            {credits && (
                <div className="mt-6 pt-3 border-t border-white/30 max-w-3xl mx-auto mb-8">
                    <p className="text-center text-gray-300 text-sm italic">{credits}</p>
                </div>
            )}

            {(similarItem || differentItem || nearbyItem) && (
                <div className="mt-12 mb-6 border-t border-white/20 pt-8">
                    <h3 className="text-2xl font-bold text-center mb-6">{translations[language].common.seeSomethingElse}</h3>
                    <div className="flex flex-wrap justify-center gap-6">
                        {similarItem && (
                            <RecommendationCard item={similarItem} subtitle={translations[language].common.similarShow} onClick={(e) => { e.stopPropagation(); openContentPopup('performance', similarItem); const modalElement = document.querySelector('[role="dialog"]'); if (modalElement) modalElement.scrollTo({ top: 0, behavior: 'smooth' }); }} language={language} translations={translations} />
                        )}
                        {differentItem && (
                            <RecommendationCard item={differentItem} subtitle={translations[language].common.differentShow} onClick={(e) => { e.stopPropagation(); openContentPopup('performance', differentItem); const modalElement = document.querySelector('[role="dialog"]'); if (modalElement) modalElement.scrollTo({ top: 0, behavior: 'smooth' }); }} language={language} translations={translations} />
                        )}
                        {nearbyItem && (
                            <RecommendationCard item={nearbyItem} subtitle={translations[language].common.nearbyShow} onClick={(e) => { e.stopPropagation(); openContentPopup('performance', nearbyItem); const modalElement = document.querySelector('[role="dialog"]'); if (modalElement) modalElement.scrollTo({ top: 0, behavior: 'smooth' }); }} language={language} translations={translations} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerformanceDetailPopup;
