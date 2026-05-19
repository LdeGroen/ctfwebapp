import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getRandomFigures } from '../../config/decorativeFigures';
import { parseDateForSorting } from '../../utils/dateUtils';
import { renderGenericPopupText, CustomTextRenderer } from '../../utils/textRenderers';
import ZoomableImage from '../common/ZoomableImage';
import PerformanceDetailPopup from './PerformanceDetailPopup';

const PopupModal = ({ showPopup, closePopup, popupContent, language, translations, allPerformances, openContentPopup, onReservationClick }) => {
  const modalRef = useRef(null);
  const iframeRef = useRef(null);
  const [secretCode, setSecretCode] = useState('');

  const [leftFig, rightFig] = useMemo(() => {
    if (!popupContent || !popupContent.data) return [null, null];
    const seed = popupContent.data.id || popupContent.data.title || 'random-popup';
    return getRandomFigures(seed);
  }, [popupContent]);

  useEffect(() => {
      if (showPopup) { setSecretCode(''); }
  }, [showPopup]);

  useEffect(() => {
    if (showPopup) {
      const focusableElements = modalRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const firstElement = focusableElements?.[0];
      const lastElement = focusableElements?.[focusableElements.length - 1];
      const previousActiveElement = document.activeElement;
      modalRef.current?.focus();
      const handleKeyDown = (event) => {
        if (event.key === 'Escape') { closePopup(); return; }
        if (event.key === 'Tab' && firstElement && lastElement) { if (event.shiftKey) { if (document.activeElement === firstElement) { lastElement.focus(); event.preventDefault(); } } else { if (document.activeElement === lastElement) { firstElement.focus(); event.preventDefault(); } } }
      };
      const currentModal = modalRef.current;
      currentModal?.addEventListener('keydown', handleKeyDown);
      return () => { currentModal?.removeEventListener('keydown', handleKeyDown); previousActiveElement?.focus(); };
    }
  }, [showPopup, closePopup, popupContent]);

  if (!showPopup) return null;

  const renderContent = () => {
    if (!popupContent || !popupContent.type) return <p className="text-white">{translations[language].common.noContentAvailable}</p>;

    switch (popupContent.type) {
      case 'helpChoosingEventSelection':
        return (
            <div className="overflow-y-auto flex-grow p-6 flex flex-col items-center justify-center min-h-[50vh]">
                <h2 className="text-3xl font-bold mb-8 text-white text-center">{translations[language].common.chooseEvent}</h2>
                <div className="flex flex-wrap justify-center gap-4 w-full max-w-2xl">
                    {popupContent.data.events.map((eventName, index) => (
                        <button key={index} onClick={() => popupContent.data.onSelectEvent(eventName)} className="bg-white text-[#20747f] hover:bg-[#9f4493] hover:text-black font-bold text-xl py-6 px-8 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-2xl min-w-[200px]">
                            {eventName}
                        </button>
                    ))}
                </div>
            </div>
        );
      case 'routeDateSelection':
        return (
            <div className="overflow-y-auto flex-grow p-6 flex flex-col items-center justify-center min-h-[50vh]">
                <h2 className="text-3xl font-bold mb-8 text-white text-center">{translations[language].common.chooseDate}</h2>
                <div className="flex flex-wrap justify-center gap-4 w-full max-w-2xl">
                    {popupContent.data.dates.map((date, index) => {
                        const dateObj = parseDateForSorting(date);
                        const displayDate = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : date;
                        return (
                            <button key={index} onClick={() => popupContent.data.onSelectDate(date)} className="bg-white text-[#20747f] hover:bg-[#78b5e3] hover:text-black font-bold text-xl py-6 px-8 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-2xl min-w-[200px]">
                                {displayDate}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
      case 'routeSelection': {
         const visibleRoutes = popupContent.data.routes.filter(route => {
             if (!route.code) return true;
             return route.code.trim().toLowerCase() === secretCode.trim().toLowerCase();
         });
         return (
            <div className="overflow-y-auto flex-grow p-6">
                <div className="relative mb-6 flex flex-col sm:flex-row justify-center items-center gap-4">
                    <h2 className="text-3xl font-bold text-white text-center sm:absolute sm:left-1/2 sm:-translate-x-1/2">{translations[language].common.routes}</h2>
                    <div className="sm:absolute sm:right-0 z-10">
                        <input type="text" value={secretCode} onChange={(e) => setSecretCode(e.target.value)} placeholder={language === 'nl' ? "Geheime code?" : "Secret code?"} className="px-3 py-2 rounded-lg text-black text-sm bg-white/90 focus:bg-white focus:ring-2 focus:ring-[#78b5e3] outline-none shadow-inner w-40 transition-all" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
                    {visibleRoutes.length === 0 ? (
                        <div className="col-span-full text-center text-white/70 italic mt-8">{language === 'nl' ? "Geen routes gevonden..." : "No routes found..."}</div>
                    ) : (
                    visibleRoutes.map((route, index) => {
                        const routePerformances = allPerformances.filter(p => route.executionIds && route.executionIds.includes(p.id));
                        const performanceCount = routePerformances.length;
                        const uniqueGenres = [...new Set(routePerformances.flatMap(p => (p.genre && p.genre !== 'N/A') ? p.genre.split(',').map(g => g.trim()) : []))];
                        const displayGenres = uniqueGenres.map(g => translations[language]?.genres?.[g] || g).join(', ');
                        const performancesByDate = routePerformances.reduce((acc, p) => { if (!acc[p.date]) acc[p.date] = []; acc[p.date].push(p.time); return acc; }, {});
                        const sortedDates = Object.keys(performancesByDate).sort((a, b) => parseDateForSorting(a) - parseDateForSorting(b));
                        return (
                            <div key={index} className="bg-white rounded-xl shadow-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl w-full max-w-sm flex flex-col" onClick={() => popupContent.data.onSelectRoute(route)}>
                                <img src={route.image} alt={language === 'nl' ? route.title : (route.titleEng || route.title)} className="w-full h-48 object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                                <div className="p-4 flex-grow flex flex-col">
                                    <h3 className="text-xl font-bold text-[#20747f] mb-2">{language === 'nl' ? route.title : (route.titleEng || route.title)}</h3>
                                    <div className="mb-3 text-sm text-gray-600 space-y-1 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                        <div className="flex items-center"><span className="font-semibold">{performanceCount} voorstellingen</span></div>
                                        {displayGenres && <div className="flex items-start"><span className="italic leading-tight">{displayGenres}</span></div>}
                                        {sortedDates.length > 0 && (
                                            <div className="flex items-start pt-1 mt-1 border-t border-gray-200">
                                                <div className="flex flex-col">
                                                    {sortedDates.map(date => {
                                                        const times = performancesByDate[date].sort();
                                                        const startTime = times[0];
                                                        const lastTime = times[times.length - 1];
                                                        const [h, m] = lastTime.split(':').map(Number);
                                                        const d = new Date();
                                                        d.setHours(h, m + 30);
                                                        const endTime = d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
                                                        let displayDateLabel = date;
                                                        const dateObj = parseDateForSorting(date);
                                                        if (!isNaN(dateObj.getTime())) { displayDateLabel = dateObj.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
                                                        return (
                                                            <span key={date} className="block">
                                                                {sortedDates.length > 1 && <span className="font-semibold text-xs uppercase mr-1">{displayDateLabel.split(' ')[0]}:</span>}
                                                                {startTime} - {endTime}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-gray-700 line-clamp-3">{language === 'nl' ? route.text : (route.textEng || route.text)}</p>
                                </div>
                            </div>
                        );
                    }))}
                </div>
            </div>
         );
      }
      case 'performance':
        return <PerformanceDetailPopup item={popupContent.data} language={language} translations={translations} allPerformances={allPerformances} openContentPopup={openContentPopup} onReservationClick={onReservationClick} />;
      case 'iframe':
        return (<iframe ref={iframeRef} onLoad={() => { try { iframeRef.current?.focus(); } catch (e) { console.warn("Could not focus iframe content:", e); } }} src={popupContent.data} title="Meer info" className="w-full h-full border-0 rounded-lg flex-grow" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>);
      case 'text':
        return (<div className="overflow-y-auto flex-grow p-4"><h2 className="text-2xl font-bold mb-4 text-white">{popupContent.data.title}</h2>{renderGenericPopupText(popupContent.data.text)}</div>);
      case 'customText':
        return (<div className="overflow-y-auto flex-grow p-4 sm:p-6 flex flex-col items-center"><div className="w-full max-w-4xl"><CustomTextRenderer text={popupContent.data.text} imageUrl={popupContent.data.imageUrl} title={popupContent.data.title} layout={popupContent.data.layout || 'default'} /></div></div>);
      case 'calmRouteInfo':
        return (<div className="overflow-y-auto flex-grow p-4"><h2 className="text-2xl font-bold mb-4 text-white">{popupContent.data.title}</h2>{renderGenericPopupText(popupContent.data.text)}{popupContent.data.button && (<button onClick={() => window.open('https://stamgast.cafetheaterfestival.nl/', '_blank')} className="mt-4 px-6 py-3 bg-[#78b5e3] text-white rounded-lg shadow-md hover:bg-[#9f4493] transition-all duration-200 text-base font-semibold">{popupContent.data.button}</button>)}</div>);
      case 'image':
        return (<ZoomableImage src={popupContent.data} alt={translations[language].common.mapTitle.replace('%s', '')} />);
      default:
        return <p className="text-white">{translations[language].common.noContentAvailable}</p>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[90]" onClick={closePopup}>
      <div ref={modalRef} onClick={e => e.stopPropagation()} tabIndex="-1" role="dialog" aria-modal="true" className="bg-[#20747f] text-white p-4 rounded-xl shadow-2xl relative w-[95vw] h-[90vh] flex flex-col overflow-hidden">
        {popupContent.type !== 'iframe' && popupContent.type !== 'image' && popupContent.type !== 'routeSelection' && (<><img src={leftFig} className="hidden md:block absolute left-2 top-20 w-24 opacity-40 pointer-events-none drop-shadow-lg z-0" alt="" /><img src={rightFig} className="hidden md:block absolute right-2 bottom-20 w-24 opacity-40 pointer-events-none drop-shadow-lg z-0" alt="" /></>)}
        <button onClick={closePopup} className="absolute top-2 right-2 text-white hover:text-gray-200 text-3xl font-bold z-20" aria-label={translations[language].common.close}>&times;</button>
        <div className="relative z-10 flex-grow flex flex-col overflow-hidden">{renderContent()}</div>
      </div>
    </div>
  );
};

export default PopupModal;
