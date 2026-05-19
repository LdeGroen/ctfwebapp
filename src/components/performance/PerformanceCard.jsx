import React, { useCallback, useMemo } from 'react';
import { Heart, Calendar, Share2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { slugify } from '../../utils/slugify';

const PerformanceCard = ({ item, favorites, toggleFavorite, addToGoogleCalendar, openContentPopup, language, handleIconMouseEnter, handleIconMouseLeave, translations, showMessageBox, safetyIcons, hideTime = false, isExportMode = false, isFriendsView = false, onNavigate, isNavigable, onReservationClick }) => {
    const getCrowdLevelInfo = useCallback((level) => {
        const defaultInfo = { fullBar: false, position: '10%', tooltip: translations[language].common.tooltipCrowdLevelGreenFull, label: null, barClass: 'bg-gradient-to-r from-green-600 via-yellow-500 to-red-600' };
        switch (level?.toLowerCase()) {
            case 'oranje': case 'orange': return { ...defaultInfo, position: '50%', tooltip: translations[language].common.tooltipCrowdLevelOrangeFull };
            case 'rood': case 'red': return { ...defaultInfo, position: '90%', tooltip: translations[language].common.tooltipCrowdLevelRedFull };
            case 'vol': case 'full': return { ...defaultInfo, fullBar: true, label: language === 'nl' ? 'Vol' : 'Full', barClass: 'bg-red-600', tooltip: translations[language].common.tooltipCrowdLevelFull };
            case 'geannuleerd': case 'cancelled': return { ...defaultInfo, fullBar: true, label: translations[language].common.geannuleerd, barClass: 'bg-red-600', tooltip: translations[language].common.tooltipCrowdLevelCancelled };
            default: return defaultInfo;
        }
    }, [language, translations]);

    const crowdInfo = useMemo(() => item.crowdLevel ? getCrowdLevelInfo(item.crowdLevel) : null, [item.crowdLevel, getCrowdLevelInfo]);
    const isCancelled = item.crowdLevel?.toLowerCase() === 'geannuleerd' || item.crowdLevel?.toLowerCase() === 'cancelled';
    const isFull = item.crowdLevel?.toLowerCase() === 'vol' || item.crowdLevel?.toLowerCase() === 'full';
    const fullTitle = item.artist ? `${item.artist} - ${item.title}` : item.title;

    const translatedGenre = useMemo(() => {
        const genres = (item.genre && item.genre !== 'N/A') ? item.genre.split(',').map(g => g.trim()) : [];
        const subgenres = Array.isArray(item.subgenre) ? item.subgenre : [];

        const allTags = [...genres, ...subgenres];

        if (allTags.length === 0) return null;

        const translated = allTags.map(g => translations[language]?.genres?.[g] || g);
        return translated.join(' / ');
    }, [item.genre, item.subgenre, language, translations]);

    const handleShare = async (e, title, url) => {
        e.stopPropagation();
        const shareText = translations[language].common.shareBody.replace('%s', title);
        const shareData = { title, text: shareText, url: url || window.location.href };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                return;
            }
        } catch (error) {
            if (error.name !== 'AbortError') console.warn('navigator.share failed, trying clipboard fallback:', error);
            else return;
        }

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(shareData.url);
                toast.success(translations[language].common.shareSuccess);
            } else {
                 throw new Error('Clipboard API not available');
            }
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            toast.error(translations[language].common.shareError);
        }
    };

    const isFavorited = favorites.has(item.id);
    const actionIcons = {
        favorite: { title: isFavorited ? translations[language].common.removeFromFavorites : translations[language].common.addToFavorites, Icon: Heart, className: isFavorited ? 'text-red-500' : 'text-gray-400 hover:text-red-400', filled: isFavorited },
        calendar: { title: translations[language].common.addToGoogleCalendar, Icon: Calendar, className: 'text-gray-500 hover:text-gray-700', filled: false },
        share: { title: translations[language].common.sharePerformance, Icon: Share2, className: 'text-gray-500 hover:text-gray-700', filled: false },
    };

    const handleCardClick = () => {
        if (isCancelled || isFull || isExportMode) return;
        if (isNavigable) {
            onNavigate(item);
        } else {
            openContentPopup('performance', item);
        }
    };

    const LocationElement = item.googleMapsUrl ? 'a' : 'div';

    return (
        <div className={`text-gray-800 rounded-xl shadow-xl border border-gray-200 transition-all duration-300 flex flex-col relative w-full md:w-[384px] bg-white overflow-hidden ${isCancelled || isFull ? 'opacity-50' : 'hover:scale-105 hover:shadow-2xl cursor-pointer'}`} onClick={handleCardClick}>
            {translatedGenre && (
                <div className="bg-[#2e9aaa] text-white text-sm md:text-base font-bold uppercase tracking-wider text-center py-1 px-4">
                    {translatedGenre}
                </div>
            )}

            <div className="p-4 flex flex-col flex-grow">
                {!hideTime && <p className="text-xl md:text-2xl font-bold text-gray-800 mb-2">{item.time}</p>}

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between w-full mb-2">
                    <h2 className="text-lg md:text-xl font-semibold text-[#20747f] mb-1 sm:mb-0 sm:mr-4 flex-grow">{fullTitle}</h2>
                    <LocationElement
                      href={item.googleMapsUrl || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => { if (isExportMode) e.preventDefault(); e.stopPropagation(); }}
                      className={`flex items-center text-md md:text-lg font-semibold text-gray-600 flex-shrink-0 text-right ${item.googleMapsUrl && !isExportMode ? 'hover:text-[#1a5b64] cursor-pointer' : 'cursor-default'} transition-colors duration-200`}
                      title={item.googleMapsUrl ? translations[language].common.openLocationInGoogleMaps : ''}
                    >
                        {item.location}
                        {item.googleMapsUrl && (
                            <span className="ml-1 text-[#20747f] relative inline-flex items-center justify-center">
                                <MapPin className="h-7 w-7" fill="currentColor" strokeWidth={0} />
                                {item.mapNumber && item.mapNumber !== 'N/A' && (
                                    <span className="absolute text-white font-bold leading-none" style={{ fontSize: '9px', top: '30%', transform: 'translateY(-50%)' }}>{item.mapNumber}</span>
                                )}
                            </span>
                        )}
                    </LocationElement>
                </div>

                {item.artistImageUrl && (
                    <div className="my-3 w-full aspect-video rounded-lg overflow-hidden bg-gray-200">
                        <img
                            src={item.artistImageUrl}
                            alt={`Afbeelding van ${item.artist}`}
                            className="w-full h-full object-cover object-top"
                            loading="lazy"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    </div>
                )}

                {!hideTime && crowdInfo && (
                  <div className="flex-1 cursor-pointer my-2" onClick={(e) => { e.stopPropagation(); if (!isExportMode) openContentPopup('text', translations[language].crowdMeterInfo); }}>
                    <p className="text-sm font-semibold text-gray-700 mb-1">{translations[language].common.crowdLevel}</p>
                    <div className={`relative w-full h-4 rounded-full ${crowdInfo.barClass}`} onMouseEnter={(e) => handleIconMouseEnter(e, crowdInfo.tooltip)} onMouseLeave={handleIconMouseLeave}>
                        {crowdInfo.fullBar ? (<div className="absolute inset-0 flex items-center justify-center"><span className="text-white font-bold text-xs uppercase">{crowdInfo.label}</span></div>)
                        : (<div className="absolute top-0 w-2 h-full rounded-full bg-gray-800" style={{ left: crowdInfo.position, transform: 'translate(-50%, -50%)', top: '50%' }}></div>)}
                    </div>
                  </div>
                )}

                {!isExportMode && (
                    <div className="absolute top-10 right-2 flex flex-row space-x-2 bg-white/50 backdrop-blur-sm p-1 rounded-full">
                        {!hideTime && !isCancelled && !isFull && !isFriendsView && Object.entries(actionIcons).map(([type, icon]) => {
                            if (type === 'read') return null;
                            const clickHandlers = {
                                favorite: (e) => toggleFavorite(item, e),
                                calendar: (e) => addToGoogleCalendar(e, fullTitle, item.date, item.time, item.location),
                                share: (e) => {
                                    // WIJZIGING: Specifieke URL genereren voor direct delen
                                    const slug = slugify(item.artist || item.title);
                                    const shareUrl = `https://www.cafetheaterfestival.nl/${slug}`;
                                    handleShare(e, fullTitle, shareUrl);
                                },
                            };
                            return (
                                <div key={type} className="cursor-pointer" onClick={clickHandlers[type]} title={icon.title}>
                                    <icon.Icon className={`h-6 w-6 transition-colors duration-200 ${icon.className}`} fill={icon.filled ? 'currentColor' : 'none'} strokeWidth={1.5} />
                                </div>
                            );
                        })}
                        {isFriendsView && (
                             <div className="cursor-pointer" onClick={(e) => toggleFavorite(item, e)} title={actionIcons.favorite.title}>
                                 <Heart className={`h-6 w-6 transition-colors duration-200 ${actionIcons.favorite.className}`} fill={isFavorited ? 'currentColor' : 'none'} strokeWidth={1.5} />
                             </div>
                        )}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-center mt-auto pt-4 border-t border-gray-200 w-full gap-4">
                    <div className="flex flex-row flex-wrap justify-start items-center gap-2">
                        {safetyIcons.map(icon => item.safetyInfo[icon.key] && (<span key={icon.key} className="text-gray-600 flex items-center" onMouseEnter={(e) => handleIconMouseEnter(e, icon.tooltip)} onMouseLeave={handleIconMouseLeave}><img src={icon.url} alt={icon.tooltip} className="h-6 w-auto inline-block"/></span>))}
                    </div>
                    {!isExportMode && (
                        <div className="flex flex-wrap flex-col sm:flex-row gap-2">
                            {item.isCalmRoute && (<button onClick={(e) => { e.stopPropagation(); openContentPopup('calmRouteInfo', translations[language].calmRouteInfo);}} className="px-4 py-2 bg-[#78b5e3] text-black rounded-lg shadow-md hover:bg-[#9f4493] transition-all duration-200 text-sm md:text-base font-semibold text-center">{translations[language].common.calmRoute}</button>)}
                            {item.isReservable && (
                             <button
                                onClick={(e) => {
                                e.stopPropagation();
                                // Check eerst of de functie wel bestaat voordat we hem aanroepen!
                                if (typeof onReservationClick === 'function') {
                                onReservationClick(item);
                                } else {
                                console.warn('Fout: onReservationClick is niet meegegeven aan PerformanceCard');
                            }
                        }}
                       className="px-4 py-2 bg-[#9f4493] text-white rounded-lg shadow-md hover:bg-[#7a3471] transition-all duration-200 text-sm md:text-base font-semibold text-center"
                        >
                        {translations[language].common.reserve}
                    </button>
                )}
                            {item.pwycLink && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); if (item.pwycLink) window.open(item.pwycLink, '_blank', 'noopener,noreferrer'); }}
                                    className="px-4 py-2 bg-[#78b5e3] text-black rounded-lg shadow-md hover:bg-[#9f4493] transition-all duration-200 text-sm md:text-base font-semibold text-center"
                                    title={translations[language].payWhatYouCan.title}
                                >
                                    {translations[language].payWhatYouCan.title}
                                </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); handleCardClick(); }} className="px-4 py-2 bg-[#20747f] text-white rounded-lg shadow-md hover:bg-[#1a5b64] transition-all duration-200 text-sm md:text-base">{translations[language].common.moreInfo}</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PerformanceCard;
