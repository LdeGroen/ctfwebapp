import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { getSafetyIcons } from '../../utils/icons';
import { parseDateForSorting } from '../../utils/dateUtils';
import { applyFormatting } from '../../utils/textRenderers';
import { getRandomFigures } from '../../config/decorativeFigures';

const PerformanceDetailPage = ({ performance, allPerformances, language, translations, onNavigateToEvent, onReservationClick }) => {
    const item = performance;
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const safetyIcons = useMemo(() => getSafetyIcons(translations, language), [language, translations]);

    const title = item.artist ? `${item.artist} - ${item.title}` : item.title;
    const credits = language === 'nl' ? item.marketingCredits : (item.marketingCreditsENG || item.marketingCredits);
    const textAboutPerformance = language === 'nl' ? item.marketingVoorstellingNL : item.marketingVoorstellingENG;
    const textAboutMakers = language === 'nl' ? item.marketingBioNL : item.marketingBioENG;
    const image1 = item.marketingAfbeelding1;

    const [leftFig, rightFig] = useMemo(() => getRandomFigures(item.id), [item.id]);

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

    const diningIcon = safetyIcons.find(i => i.key === 'diningFacility');
    const wheelchairIcon = safetyIcons.find(i => i.key === 'wheelchairAccessible');

    return (
        <div className="relative px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 pt-32 sm:pt-28 text-white">
            <img src={leftFig} className="hidden md:block absolute left-8 top-32 w-24 opacity-90 pointer-events-none drop-shadow-xl" alt="Decoratief figuur links" />
            <img src={rightFig} className="hidden md:block absolute right-8 top-48 w-24 opacity-90 pointer-events-none drop-shadow-xl" alt="Decoratief figuur rechts" />

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 text-center">{title}</h2>

            <div className="max-w-4xl mx-auto my-6 p-4 bg-[#78b5e3] rounded-lg text-black">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsScheduleOpen(!isScheduleOpen)}>
                    <h3 className="text-xl font-semibold">{translations[language].common.performanceSchedule}</h3>
                    <ChevronDown className={`w-6 h-6 transition-transform duration-300 ${isScheduleOpen ? 'rotate-180' : ''}`} />
                </div>
                {isScheduleOpen && (
                    <ul className="space-y-2 mt-4 animate-fade-in">
                        {performanceOccurrences.map(occ => (
                            <li key={occ.id} className="flex flex-wrap justify-between items-center text-lg gap-x-4 gap-y-1">
                                <div className="flex-1 min-w-[150px]">
                                    <button onClick={() => onNavigateToEvent('timetable', occ.event)} className="underline hover:text-blue-200 text-left font-semibold">{occ.event}</button>
                                </div>
                                <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                                    <span>{occ.location}</span>
                                    {occ.safetyInfo?.diningFacility && diningIcon && (
                                        <img src={diningIcon.url} alt={diningIcon.label} title={diningIcon.tooltip} className="h-6 w-auto"/>
                                    )}
                                    {occ.safetyInfo?.wheelchairAccessible && wheelchairIcon && (
                                        <img src={wheelchairIcon.url} alt={wheelchairIcon.label} title={wheelchairIcon.tooltip} className="h-6 w-auto"/>
                                    )}
                                </div>
                                <div className="flex-1 text-right min-w-[150px] flex items-center justify-end gap-3">
                                    <span>{occ.date} - {occ.time}</span>
                                    {occ.isReservable && (
                                        <button onClick={(e) => { e.stopPropagation(); onReservationClick(occ); }} className="px-3 py-1 bg-[#9f4493] text-white rounded shadow-md hover:bg-[#7a3471] text-sm font-semibold transition-colors">
                                            {translations[language].common.reserve}
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6 my-8 max-w-6xl mx-auto">
                <div className="md:w-1/3 text-left md:text-right">
                    <h3 className="text-xl md:text-2xl font-semibold mb-3 border-b-2 border-white/50 pb-2">{translations[language].common.aboutShow}</h3>
                    <div className="prose prose-invert max-w-none md:prose-lg">{renderTextWithLineBreaks(textAboutPerformance)}</div>
                </div>
                {image1 && (
                    <div className="md:w-1/3">
                        <img src={image1} alt={`Afbeelding van ${title}`} className="rounded-lg shadow-lg w-full h-auto object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                )}
                <div className="md:w-1/3 text-left">
                    <h3 className="text-xl md:text-2xl font-semibold mb-3 border-b-2 border-white/50 pb-2">{translations[language].common.aboutCreators}</h3>
                    <div className="prose prose-invert max-w-none md:prose-lg">{renderTextWithLineBreaks(textAboutMakers)}</div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto my-6 p-4 bg-[#78b5e3] rounded-lg text-black">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    {translatedGenre && <h3 className="text-lg"><span className="font-bold">Genre:</span> {translatedGenre}</h3>}
                    <div className="flex flex-row flex-wrap justify-center items-center gap-3">
                        {safetyIcons.map(icon => item.safetyInfo[icon.key] && (
                            <img key={icon.key} src={icon.url} alt={icon.label} title={icon.tooltip} className="h-8 w-auto"/>
                        ))}
                    </div>
                </div>
            </div>

            {credits && (
                <div className="mt-8 pt-4 border-t border-white/30 max-w-4xl mx-auto">
                    <p className="text-center text-gray-300 md:text-lg italic">{credits}</p>
                </div>
            )}
        </div>
    );
};

export default PerformanceDetailPage;
