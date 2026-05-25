import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Client, Databases, Query } from './config/appwrite';
import ReactGA from 'react-ga4';

// Config
import { APPWRITE_CONFIG } from './config/appwrite';
import { translations } from './config/translations';
import { getRandomFigures } from './config/decorativeFigures';

// Utils
import { parseDateForSorting } from './utils/dateUtils';
import { slugify } from './utils/slugify';
import { getSafetyIcons } from './utils/icons';
// Layout
import ErrorBoundary from './components/ErrorBoundary';
import TopRightControls from './components/layout/TopRightControls';
import AppHeader from './components/layout/AppHeader';
import StickyHeader from './components/layout/StickyHeader';
import EventNavigation from './components/layout/EventNavigation';
import DateNavigation from './components/layout/DateNavigation';
import SponsorDisplay from './components/layout/SponsorDisplay';
import AppFooter from './components/layout/AppFooter';

// Controls
import EventViewSwitcher from './components/controls/EventViewSwitcher';
import SearchFilterNudges from './components/controls/SearchFilterNudges';

// Performance / timetable
import TimetableDisplay from './components/performance/TimetableDisplay';
import BlockTimetable from './components/performance/BlockTimetable';

// Modals
import PopupModal from './components/modals/PopupModal';
import PrivacyPolicyModal from './components/modals/PrivacyPolicyModal';
import ReservationModal from './components/modals/ReservationModal';
import CustomTooltip from './components/common/CustomTooltip';
import MessageBox from './components/modals/MessageBox';
import ExportModal from './components/modals/ExportModal';
import ImportFavoritesModal from './components/modals/ImportFavoritesModal';
import { Toaster, toast } from 'sonner';
import AppDownloadPopup from './components/modals/AppDownloadPopup';
import CookieConsentPopup from './components/modals/CookieConsentPopup';

// Pages
import PerformanceDetailPage from './components/pages/PerformanceDetailPage';
import InfoDetailPage from './components/pages/InfoDetailPage';
import MoreInfoPage from './components/pages/MoreInfoPage';
import AccessibilityPage from './components/pages/AccessibilityPage';
import NewsPage from './components/pages/NewsPage';

// Common
import OfflineIndicator from './components/common/OfflineIndicator';

const AppContent = () => {
  const GA_MEASUREMENT_ID = 'G-FQVC6NGTMP';
  const [timetableData, setTimetableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupContent, setPopupContent] = useState({ type: null, data: null });
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState('timetable');
  const [uniqueEvents, setUniqueEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [favorites, setFavorites] = useState(new Set());
  const [scheduledCustomNotifications, setScheduledCustomNotifications] = useState(new Set());
  const [language, setLanguage] = useState(() => localStorage.getItem('appLanguage') || 'nl');
  const [showCustomTooltip, setShowCustomTooltip] = useState(false);
  const [customTooltipContent, setCustomTooltipContent] = useState('');
  const [customTooltipPosition, setCustomTooltipPosition] = useState({ x: 0, y: 0 });
  const [messageBoxConfig, setMessageBoxConfig] = useState({ show: false, message: '', buttons: [], title: '' });
  const [permissionRequestDismissed, setPermissionRequestDismissed] = useState(false);
  const [eventInfoMap, setEventInfoMap] = useState({});
  const [currentSponsorInfo, setCurrentSponsorInfo] = useState(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [eventViewMode, setEventViewMode] = useState('card');
  const [favoritesViewMode, setFavoritesViewMode] = useState('card');
  const [friendsFavoritesViewMode, setFriendsFavoritesViewMode] = useState('card');
  const [isContentVisible, setIsContentVisible] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportConfig, setExportConfig] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [friendsFavorites, setFriendsFavorites] = useState(new Set());
  const [showImportPopup, setShowImportPopup] = useState(false);
  const [sharedFavoritesForImport, setSharedFavoritesForImport] = useState([]);
  const [iconFilters, setIconFilters] = useState(new Set());
  const [filterScope, setFilterScope] = useState('current');
  const [genreFilters, setGenreFilters] = useState(new Set());
  const [generalInfoData, setGeneralInfoData] = useState([]);
  const [accessibilityInfoData, setAccessibilityInfoData] = useState([]);
  const [newsData, setNewsData] = useState([]);
  const [benefactorLogos, setBenefactorLogos] = useState([]);
  const [cookieConsent, setCookieConsent] = useState(null);
  const [showAppDownloadPopup, setShowAppDownloadPopup] = useState(false);

  const [activePerformance, setActivePerformance] = useState(null);
  const [activeInfoPage, setActiveInfoPage] = useState(null);
  const [routesData, setRoutesData] = useState([]);
  const [activeRoute, setActiveRoute] = useState(null);

  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservationPerformance, setReservationPerformance] = useState(null);

  const openReservationModal = useCallback((performance) => {
      setReservationPerformance(performance);
      setShowReservationModal(true);
  }, []);

  const handleReservationSuccess = useCallback(() => {
      // Capaciteit wordt bij volgende achtergrond-refresh bijgewerkt vanuit Appwrite.
  }, []);

  const [landingFigures] = useState(() => getRandomFigures());

  const newsSectionRef = useRef(null);
  const titleRef = useRef(null);
  const sponsorRef = useRef(null);
  const notificationTimeouts = useRef({});
  const prevTimetableDataRef = useRef([]);
  const exportCardViewRef = useRef(null);
  const exportBlockViewRef = useRef(null);

  const trackEvent = useCallback((category, action, label) => {
    if (localStorage.getItem('cookieConsent') === 'all') {
      ReactGA.event({ category, action, label });
    }
  }, []);

  const safetyIcons = useMemo(() => getSafetyIcons(translations, language), [language]);

  const allGenres = useMemo(() => {
    const genreKeys = new Set();
    const relevantData = selectedEvent
      ? timetableData.filter(item => item.event === selectedEvent)
      : timetableData;

    relevantData.forEach(item => {
        if (item.genre && item.genre !== 'N/A') {
            item.genre.split(',').forEach(g => genreKeys.add(g.trim()));
        }
    });

    return [...genreKeys].map(key => ({
        key: key,
        label: translations[language].genres[key] || key
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [timetableData, selectedEvent, language]);

  useEffect(() => {
    setGenreFilters(new Set());
  }, [selectedEvent]);

  const formattedData = useMemo(() => {
    let sourceData;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    if (currentView === 'favorites') {
        sourceData = timetableData.filter(item => favorites.has(item.id));
    } else if (currentView === 'friends-favorites') {
        sourceData = timetableData.filter(item => friendsFavorites.has(item.id));
    } else {
        sourceData = timetableData;
    }

    const applyFilters = (data) => data.filter(item => {
        if (iconFilters.size > 0) {
            for (const filterKey of iconFilters) {
                if (!item.safetyInfo[filterKey]) return false;
            }
        }

        if (genreFilters.size > 0) {
            if (!item.genre || item.genre === 'N/A') return false;
            const itemGenres = item.genre.split(',').map(g => g.trim());
            if (!itemGenres.some(g => genreFilters.has(g))) return false;
        }

        if (searchTerm) {
            const inArtist = item.artist && item.artist.toLowerCase().includes(lowerCaseSearchTerm);
            const inTitle = item.title.toLowerCase().includes(lowerCaseSearchTerm);
            const inLocation = item.location.toLowerCase().includes(lowerCaseSearchTerm);
            if (!inArtist && !inTitle && !inLocation) return false;
        }

        return true;
    });

    if (filterScope === 'all' && (iconFilters.size > 0 || genreFilters.size > 0)) {
        sourceData = applyFilters(sourceData);
    } else if (filterScope === 'current' && selectedEvent) {
        const eventData = sourceData.filter(item => item.event === selectedEvent);
        const otherData = sourceData.filter(item => item.event !== selectedEvent);
        sourceData = [...applyFilters(eventData), ...otherData];
    } else if (searchTerm) {
        sourceData = applyFilters(sourceData);
    }

    if (currentView === 'timetable' && selectedEvent) {
        if (selectedDate === 'calm-route') {
            sourceData = sourceData.filter(item => item.event === selectedEvent && item.isCalmRoute);
        } else if (selectedDate === 'utrecht-centraal') {
             sourceData = sourceData.filter(item =>
                item.event === selectedEvent &&
                (item.location && item.location.toLowerCase().includes('utrecht centraal'))
            );
        } else if (selectedDate === 'all-performances') {
            const uniqueTitles = new Map();
            sourceData.filter(item => item.event === selectedEvent).forEach(item => {
                const fullTitle = item.artist ? `${item.artist} - ${item.title}` : item.title;
                if (!uniqueTitles.has(fullTitle)) uniqueTitles.set(fullTitle, item);
            });
            sourceData = [...uniqueTitles.values()];
        } else if (selectedDate) {
            sourceData = sourceData.filter(item =>
                item.event === selectedEvent &&
                item.date === selectedDate &&
                !(item.location && item.location.toLowerCase().includes('utrecht centraal'))
            );
        }
    }

    if (sourceData.length === 0) return [];

    if (currentView === 'favorites' || currentView === 'friends-favorites' || searchTerm || (filterScope === 'all' && (iconFilters.size > 0 || genreFilters.size > 0)) || selectedDate === 'utrecht-centraal') {
        const groupedByEvent = sourceData.reduce((acc, item) => {
            (acc[item.event] = acc[item.event] || []).push(item);
            return acc;
        }, {});
        return Object.keys(groupedByEvent).sort((a, b) => {
            const dateA = parseDateForSorting(eventInfoMap[a]?.dateString);
            const dateB = parseDateForSorting(eventInfoMap[b]?.dateString);
            if (!dateA || isNaN(dateA.getTime())) return 1;
            if (!dateB || isNaN(dateB.getTime())) return -1;
            return dateA - dateB;
        }).map(eventName => {
            const itemsForEvent = groupedByEvent[eventName];
            const groupedByDate = itemsForEvent.reduce((acc, item) => {
                (acc[item.date] = acc[item.date] || []).push(item);
                return acc;
            }, {});
            return {
                groupTitle: eventName,
                subGroups: Object.keys(groupedByDate).sort((a,b) => parseDateForSorting(a) - parseDateForSorting(b)).map(date => ({
                    subGroupTitle: date,
                    items: groupedByDate[date].sort((a, b) => a.time.localeCompare(b.time))
                }))
            };
        });
    }

    let groupTitle = null;
    if (selectedDate === 'calm-route') {
        groupTitle = `${translations[language].common.calmRoute} - ${selectedEvent}`;
    }

    const groupedByDate = sourceData.reduce((acc, item) => {
        (acc[item.date] = acc[item.date] || []).push(item);
        return acc;
    }, {});

    return [{
      groupTitle,
      subGroups: Object.keys(groupedByDate).sort((a,b) => parseDateForSorting(a) - parseDateForSorting(b)).map(date => ({
        subGroupTitle: selectedDate === 'calm-route' ? date : null,
        items: groupedByDate[date].sort((a, b) => selectedDate === 'all-performances' ? a.title.localeCompare(b.title) : a.time.localeCompare(b.time))
      }))
    }];
  }, [searchTerm, currentView, selectedEvent, selectedDate, timetableData, favorites, friendsFavorites, language, eventInfoMap, iconFilters, genreFilters, filterScope]);

  const favoritesDataForExport = useMemo(() => {
    const favoriteItems = timetableData.filter(item => favorites.has(item.id));
    if (favoriteItems.length === 0) return [];

    const groupedByEvent = favoriteItems.reduce((acc, item) => {
        (acc[item.event] = acc[item.event] || []).push(item);
        return acc;
    }, {});

    return Object.keys(groupedByEvent).sort((a, b) => {
        const dateA = parseDateForSorting(eventInfoMap[a]?.dateString);
        const dateB = parseDateForSorting(eventInfoMap[b]?.dateString);
        if (!dateA || isNaN(dateA.getTime())) return 1;
        if (!dateB || isNaN(dateB.getTime())) return -1;
        return dateA - dateB;
    }).map(eventName => {
        const itemsForEvent = groupedByEvent[eventName];
        const groupedByDate = itemsForEvent.reduce((acc, item) => {
            (acc[item.date] = acc[item.date] || []).push(item);
            return acc;
        }, {});
        return {
            groupTitle: eventName,
            subGroups: Object.keys(groupedByDate).sort((a,b) => parseDateForSorting(a) - parseDateForSorting(b)).map(date => ({
                subGroupTitle: date,
                items: groupedByDate[date].sort((a, b) => a.time.localeCompare(b.time))
            }))
        };
    });
  }, [timetableData, favorites, eventInfoMap]);

  const handleAnimatedUpdate = useCallback((updateFunction) => {
    setIsContentVisible(false);
    setTimeout(() => {
      updateFunction();
      setIsContentVisible(true);
    }, 300);
  }, []);

  const closeMessageBox = useCallback(() => setMessageBoxConfig(prev => ({ ...prev, show: false })), []);

  const showMessageBox = useCallback((message, buttons = [], title = '') => {
    const finalButtons = buttons.length > 0 ? buttons : [{ text: 'OK', onClick: closeMessageBox, className: 'bg-gray-200 hover:bg-gray-300 text-gray-800' }];
    setMessageBoxConfig({ show: true, message, buttons: finalButtons, title });
  }, [closeMessageBox]);

  useEffect(() => {
    const scriptId = 'html-to-image-script';
    if (document.getElementById(scriptId)) return;
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const generateAndShareImage = useCallback(async (element) => {
      if (!element) {
          toast.error(translations[language].common.exportError);
          return;
      }

      const originalBodyColor = document.body.style.backgroundColor;
      try {
          document.body.style.backgroundColor = '#20747f';
          const options = {
              quality: 0.95,
              backgroundColor: '#20747f',
              cacheBust: true,
              imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
              pixelRatio: 2
          };
          const dataUrl = await window.htmlToImage.toPng(element, options);

          if (window.AndroidBridge && window.AndroidBridge.shareImage) {
              const base64Data = dataUrl.split(',')[1];
              const title = translations[language].common.shareFavorites;
              const text = translations[language].common.shareFavorites;
              const filename = 'ctf-favorieten.png';
              window.AndroidBridge.shareImage(base64Data, filename, title, text);
          } else {
              const blob = await (await fetch(dataUrl)).blob();
              const file = new File([blob], 'ctf-favorieten.png', { type: 'image/png' });
              if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                  await navigator.share({ files: [file], title: translations[language].common.shareFavorites, text: translations[language].common.shareFavorites });
              } else {
                  const a = document.createElement('a');
                  a.href = dataUrl;
                  a.download = 'ctf-favorieten.png';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
              }
          }
      } catch (error) {
          console.error('Fout tijdens het genereren of delen van de afbeelding:', error);
          toast.error(translations[language].common.exportError);
      } finally {
          document.body.style.backgroundColor = originalBodyColor;
      }
  }, [language, showMessageBox]);

  const handleExport = useCallback(async (type) => {
    if (type === 'link') {
        const idToIndexMap = new Map(timetableData.map((item, index) => [item.id, index]));
        const favoriteIndices = Array.from(favorites)
            .map(id => idToIndexMap.get(id))
            .filter(index => index !== undefined);

        const encodedIndices = btoa(favoriteIndices.join(','));

        const publicBaseUrl = 'https://www.cafetheaterfestival.nl/';
        const url = `${publicBaseUrl}?fav_indices=${encodedIndices}`;

        const shareData = {
            title: translations[language].common.shareLinkTitle,
            text: translations[language].common.shareLinkBody,
            url: url,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(url);
                toast.success(translations[language].common.shareSuccess);
            }
        } catch (err) {
            console.error('Error sharing link:', err);
            toast.error(translations[language].common.shareError);
        }
        setShowExportModal(false);
    } else if (type === 'image') {
        setExportConfig({ type: favoritesViewMode });
    }
  }, [favorites, language, showMessageBox, favoritesViewMode, timetableData]);

  useEffect(() => {
    if (!exportConfig) return;

    const doExport = async () => {
        setIsExporting(true);
        await new Promise(resolve => setTimeout(resolve, 100));

        const elementRef = exportConfig.type === 'card'
            ? exportCardViewRef.current
            : exportBlockViewRef.current;

        if (elementRef && typeof window.htmlToImage !== 'undefined') {
            await generateAndShareImage(elementRef);
        } else {
            console.error("Export prerequisites not met. Element or htmlToImage missing.");
            toast.error(translations[language].common.exportError);
        }

        setIsExporting(false);
        setExportConfig(null);
        setShowExportModal(false);
    };

    doExport();
  }, [exportConfig, generateAndShareImage, language, showMessageBox]);

  useEffect(() => {
    const handleScroll = () => {
        if (isInitialLoad && !activePerformance && !activeInfoPage && !activeRoute) {
            setShowStickyHeader(window.scrollY > 50);
        } else {
            setShowStickyHeader(true);
        }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isInitialLoad, activePerformance, activeInfoPage, activeRoute]);

  const returnToInitialView = useCallback(() => {
      handleAnimatedUpdate(() => {
        setActivePerformance(null);
        setActiveInfoPage(null);
        setActiveRoute(null);
        setCurrentView('timetable');
        setIsInitialLoad(true);
        setSelectedEvent(null);
        setSelectedDate(null);
        setSearchTerm('');
        setShowStickyHeader(false);
        try {
          const base = window.location.pathname.split('/').slice(0, -1).join('/') || '/';
          window.history.pushState({ view: 'initial' }, '', base + '#');
        } catch (e) {
          console.warn("Could not update history state:", e);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
  }, [handleAnimatedUpdate]);

  const handleViewChange = useCallback((view, event = null) => {
    handleAnimatedUpdate(() => {
        setActivePerformance(null);
        setActiveInfoPage(null);
        setActiveRoute(null);

        let hash = '#';
        if (view === 'timetable' && event) hash = `#${encodeURIComponent(event)}`;
        else if (view === 'favorites') hash = '#favorites';
        else if (view === 'friends-favorites') hash = '#friends-favorites';
        else if (view === 'more-info') hash = '#more-info';
        else if (view === 'accessibility') hash = '#accessibility';

        const newUrl = window.location.pathname.split('/').slice(0, -1).join('/') + hash;
        const state = { view: 'detail', event, viewMode: 'card', currentView: view };

        try {
            window.history.pushState(state, '', newUrl);
        } catch (e) {
            console.warn("Could not update history state:", e);
        }

        setCurrentView(view);
        setSelectedEvent(event);
        if (view === 'timetable') setEventViewMode('card');
        setIsInitialLoad(false);
        setShowStickyHeader(true);

        if (view === 'timetable' && event) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const validItemsForDefaultDate = timetableData.filter(item => {
                if (item.event !== event || !item.date || item.date === 'N/A') return false;
                const performanceDate = parseDateForSorting(item.date);
                if (!performanceDate || performanceDate < today) return false;
                if (item.location && item.location.toLowerCase().includes('utrecht centraal')) return false;
                return true;
            });

            const itemsByDate = {};
            validItemsForDefaultDate.forEach(item => {
                if (!itemsByDate[item.date]) itemsByDate[item.date] = [];
                itemsByDate[item.date].push(item);
            });

            const sortedDates = Object.keys(itemsByDate).sort((a, b) => parseDateForSorting(a) - parseDateForSorting(b));

            let defaultDate = sortedDates.find(date => {
                const items = itemsByDate[date];
                return !items.every(item => item.isTryOut);
            });

            if (!defaultDate && sortedDates.length > 0) {
                defaultDate = sortedDates[0];
            }

            setSelectedDate(defaultDate || 'all-performances');
        } else if (view === 'favorites') {
            setSelectedDate('favorites-view');
        } else if (view === 'friends-favorites') {
            setSelectedDate('friends-favorites-view');
        } else if (view === 'more-info' || view === 'accessibility') {
            setSelectedDate(null);
        }

        window.scrollTo({ top: 0, behavior: 'auto'});
    });
  }, [timetableData, handleAnimatedUpdate]);

  const openContentPopup = useCallback((type, data) => {
    let finalData = data;
    if (type === 'iframe' && typeof data === 'string' && data.startsWith('http')) {
        try {
            const url = new URL(data);
            url.searchParams.set('ctf_app', '1');

            if (url.hostname === 'vrijwilliger.cafetheaterfestival.nl') {
                if (language === 'en') {
                    if (!url.pathname.startsWith('/en')) {
                        url.pathname = '/en' + url.pathname;
                    }
                } else {
                    if (url.pathname.startsWith('/en/')) {
                        url.pathname = url.pathname.substring(3);
                    } else if (url.pathname === '/en') {
                        url.pathname = '/';
                    }
                }
            }

            finalData = url.href;
        } catch (e) { console.error("Invalid URL for iframe:", data, e); }
    }

    let matchedItem = null;
    if (type === 'customText' && data?.title) {
        matchedItem = generalInfoData.find(i => (i.title[language] || i.title.nl) === data.title) ||
                      accessibilityInfoData.find(i => (i.title[language] || i.title.nl) === data.title) ||
                      newsData.find(i => (i.title[language] || i.title.nl) === data.title);
    } else if (type === 'iframe' && typeof data === 'string') {
         matchedItem = generalInfoData.find(i => (i.url[language] || i.url.nl) === data) ||
                       accessibilityInfoData.find(i => (i.url[language] || i.url.nl) === data) ||
                       newsData.find(i => (i.url[language] || i.url.nl) === data);
    }

    if (matchedItem) {
        const title = matchedItem.title[language] || matchedItem.title.nl;
        const slug = slugify(title);
        try {
            window.history.pushState({ infoSlug: slug, view: 'popup' }, '', '/' + slug);
        } catch(e) {
             console.warn("Could not push state for info popup", e);
        }
    }

    setPopupContent({ type, data: finalData });
    setShowPopup(true);
  }, [language, generalInfoData, accessibilityInfoData, newsData]);

  const closePopup = useCallback(() => {
      setShowPopup(false);
  }, []);

  const handleNavigateToPerformance = useCallback((performance) => {
      const slug = slugify(performance.artist || performance.title);
      const url = `/${slug}`;
      try {
          window.history.pushState({ performanceId: performance.id }, '', url);
      } catch (e) {
          console.warn("Could not update history state for performance:", e);
      }
      setActivePerformance(performance);
      setActiveInfoPage(null);
      setActiveRoute(null);
      setIsInitialLoad(false);
      setShowStickyHeader(true);
      window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const checkForInitialNotification = () => {
      if (window.AndroidBridge && typeof window.AndroidBridge.getInitialNotificationData === 'function') {
        try {
          const jsonData = window.AndroidBridge.getInitialNotificationData();
          if (jsonData) {
            const data = JSON.parse(jsonData);
            if (data && data.url) {
              console.log("Notificatie data ontvangen van native:", data);
              openContentPopup('iframe', data.url);
            }
          }
        } catch (e) {
          console.error("Fout bij het ophalen/parsen van initiële notificatie data:", e);
        }
      }
    };

    const timer = setTimeout(checkForInitialNotification, 100);
    return () => clearTimeout(timer);
  }, [openContentPopup]);

  useEffect(() => {
    const isModalOpen = showPopup || showPrivacyPolicy || messageBoxConfig.show || showExportModal || showImportPopup || cookieConsent === null;
    const mainContentEl = document.getElementById('main-content-area');

    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      if (mainContentEl) mainContentEl.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (mainContentEl) mainContentEl.style.overflow = 'auto';
    }
  }, [showPopup, showPrivacyPolicy, messageBoxConfig.show, showExportModal, showImportPopup, cookieConsent]);

  const handleCloseAppDownloadPopup = () => {
    try {
        localStorage.setItem('ctfAppDownloadPopupDismissed', 'true');
    } catch (e) {
        console.error("Error saving popup dismissal state:", e);
    }
    setShowAppDownloadPopup(false);
  };

  useEffect(() => {
    try {
      const storedConsent = localStorage.getItem('cookieConsent');
      if (storedConsent) {
        setCookieConsent(storedConsent);
        if (storedConsent === 'all' && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX') {
          ReactGA.initialize(GA_MEASUREMENT_ID);
          console.log("Google Analytics geïnitialiseerd op basis van bestaande toestemming.");
        }
      }

      const storedFavorites = localStorage.getItem('ctfTimetableFavorites');
      if (storedFavorites) setFavorites(new Set(JSON.parse(storedFavorites)));

      const storedFriendsFavorites = localStorage.getItem('ctfFriendsFavorites');
      if (storedFriendsFavorites) setFriendsFavorites(new Set(JSON.parse(storedFriendsFavorites)));

      const storedGeneralInfo = localStorage.getItem('ctfGeneralInfoCache');
      if (storedGeneralInfo) setGeneralInfoData(JSON.parse(storedGeneralInfo));

      const storedAccessibilityInfo = localStorage.getItem('ctfAccessibilityInfoCache');
      if (storedAccessibilityInfo) setAccessibilityInfoData(JSON.parse(storedAccessibilityInfo));

      const storedNews = localStorage.getItem('ctfNewsCache');
      if (storedNews) setNewsData(JSON.parse(storedNews));

      const storedBenefactorLogos = localStorage.getItem('ctfBenefactorLogosCache');
      if (storedBenefactorLogos) setBenefactorLogos(JSON.parse(storedBenefactorLogos));

      const storedCustomNotifs = localStorage.getItem('ctfScheduledCustomNotifications');
      if (storedCustomNotifs) setScheduledCustomNotifications(new Set(JSON.parse(storedCustomNotifs)));

      const dismissed = localStorage.getItem('ctfNotificationPermissionDismissed');
      if (dismissed === 'true') setPermissionRequestDismissed(true);

    } catch (e) {
        console.error("Fout bij laden uit localStorage, cache wordt gewist:", e);
        localStorage.clear();
    }
  }, [GA_MEASUREMENT_ID]);

  useEffect(() => { localStorage.setItem('appLanguage', language); }, [language]);

  useEffect(() => {
    const timeouts = notificationTimeouts;
    return () => {
      Object.values(timeouts.current).forEach(clearTimeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
        if (window.AndroidBridge === undefined && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    } catch (e) {
        console.error("Error requesting notification permission:", e);
    }
  }, []);

  const handleLanguageChange = () => setLanguage(prev => prev === 'nl' ? 'en' : 'nl');

  const fetchDataFromAppwrite = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
        const client = new Client().setEndpoint(APPWRITE_CONFIG.endpoint).setProject(APPWRITE_CONFIG.projectId);
        const databases = new Databases(client);

        const fetchAllDocuments = async (collectionId) => {
            try {
                let documents = [];
                let response;
                let offset = 0;
                const limit = 100;
                do {
                    response = await databases.listDocuments(APPWRITE_CONFIG.databaseId, collectionId, [Query.limit(limit), Query.offset(offset)]);
                    documents.push(...response.documents);
                    offset += limit;
                } while (documents.length < response.total);
                return documents;
            } catch (e) {
                console.error(`Fout bij ophalen collectie ${collectionId}:`, e);
                return [];
            }
        };

        const [
            companies, performances, locations, executions,
            eventsData, sponsors, news, info, accessibility, marketing,
            routesRaw
        ] = await Promise.all([
            fetchAllDocuments(APPWRITE_CONFIG.collections.companies),
            fetchAllDocuments(APPWRITE_CONFIG.collections.performances),
            fetchAllDocuments(APPWRITE_CONFIG.collections.locations),
            fetchAllDocuments(APPWRITE_CONFIG.collections.executions),
            fetchAllDocuments(APPWRITE_CONFIG.collections.events),
            fetchAllDocuments(APPWRITE_CONFIG.collections.sponsors),
            fetchAllDocuments(APPWRITE_CONFIG.collections.news),
            fetchAllDocuments(APPWRITE_CONFIG.collections.info),
            fetchAllDocuments(APPWRITE_CONFIG.collections.toegankelijkheid),
            fetchAllDocuments(APPWRITE_CONFIG.collections.marketing),
            fetchAllDocuments(APPWRITE_CONFIG.collections.routes)
        ]);
        clearTimeout(timeoutId);

        const companiesMap = new Map(companies.map(c => [c.$id, c]));
        const performancesMap = new Map(performances.map(p => [p.$id, p]));
        const locationsMap = new Map(locations.map(l => [l.$id, l]));
        const executionsMap = new Map(executions.map(e => [e.$id, e]));
        const marketingMap = new Map(marketing.map(m => [m.PerformanceId, m]));

        const eventIdToNameMap = new Map(eventsData.map(e => [e.$id, e.Name]));

        const parsedRoutes = routesRaw.map(r => ({
            id: r.$id,
            event: eventIdToNameMap.get(r.Event) || r.Event,
            title: r.Titel,
            titleEng: r.TitelENG,
            text: r.Tekst,
            textEng: r.TekstENG,
            image: r.Afbeelding,
            executionIds: r.Uitvoeringen || [],
            dates: r.Datum || [],
            code: r.Code
        }));
        setRoutesData(parsedRoutes);

        const sortFunc = (a, b) => {
            const numA = a.Nummer || 999;
            const numB = b.Nummer || 999;
            return numA - numB;
        };
        const sortedInfo = info.sort(sortFunc);
        const sortedAccessibility = accessibility.sort(sortFunc);
        const sortedNews = news.sort(sortFunc);

        const localEventInfoMap = {};
        let allParsedData = [];

        const eventsInApp = eventsData.filter(event => event.InApp === true);

        for (const eventDoc of eventsInApp) {
            localEventInfoMap[eventDoc.Name] = {
                mapUrl: eventDoc.mapUrl,
                sponsorLogo: eventDoc.sponsorLogoUrl,
                dateString: null,
                displayDates: eventDoc.Dates
            };

            const processedPerformanceIdsForEvent = new Set();

            if (eventDoc.executionIds && eventDoc.executionIds.length > 0) {
                for (const execId of eventDoc.executionIds) {
                    const execution = executionsMap.get(execId);
                    if (!execution) continue;

                    const performance = performancesMap.get(execution.performanceId);
                    if (!performance) continue;

                    if (performance.InApp !== true) continue;

                    const company = companiesMap.get(performance.companyId);
                    const locationData = locationsMap.get(execution.locationId);
                    if (!locationData) continue;

                    const marketingInfo = marketingMap.get(performance.$id);

                    const dateTime = new Date(execution.DateTime);
                    if (isNaN(dateTime.getTime())) continue;

                    const eventDate = dateTime.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    const eventTime = dateTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

                    const eventStartDate = parseDateForSorting(localEventInfoMap[eventDoc.Name].dateString);
                    if (eventStartDate || dateTime < eventStartDate) {
                        localEventInfoMap[eventDoc.Name].dateString = eventDate;
                    }

                    allParsedData.push({
                        id: execution.$id,
                        eventId: eventDoc.$id,
                        originalPerformanceId: performance.$id,
                        locationId: locationData.$id,
                        date: eventDate,
                        time: eventTime,
                        artist: company?.Name || 'Onbekend',
                        title: performance.Title || 'Onbekend',
                        location: locationData.Name || 'Onbekende Locatie',
                        url: performance.meerInfoUrl || '',
                        event: eventDoc.Name,
                        googleMapsUrl: locationData.googleMapsUrl || '',
                        pwycLink: performance.pwycLink || '',
                        mapNumber: locationData.locationNumber || 'N/A',
                        mapImageUrl: eventDoc.mapUrl || '',
                        genre: performance.genre || 'N/A',
                        subgenre: performance.Subgenre || [],
                        isCalmRoute: execution.quietRoute || false,
                        crowdLevel: execution.expectedCrowd || '',
                        isTryOut: execution.TryOut || false,
                        isReservable: execution.reserveerbaar || false,
                        resTextNL: execution.ReserveringTekst || '',
                        resTextENG: execution.ReserveringTekstENG || '',
                        resCapacity: parseInt(execution.ReserveringCapaciteit, 10) || 0,
                        resAvailableCapacity: execution.CurrentReserverenCapacity !== null && execution.CurrentReserverenCapacity !== undefined
                            ? parseInt(execution.CurrentReserverenCapacity, 10)
                            : null,
                        artistImageUrl: marketingInfo?.Afbeelding2 || performance.imageUrl || '',
                        safetyInfo: {
                            wheelchairAccessible: locationData.isWheelchairAccessible || false,
                            suitableForChildren: performance.isChildFriendly || false,
                            dutchLanguage: performance.isDutchLanguage || false,
                            englishLanguage: performance.isEnglishLanguage || false,
                            dialogueFree: performance.isDialogueFree || false,
                            diningFacility: locationData.hasDining || false,
                            hasNGT: execution.hasNgt || false,
                        },
                        marketingCredits: marketingInfo?.Credits || null,
                        marketingCreditsENG: marketingInfo?.CreditsENG || null,
                        marketingVoorstellingNL: marketingInfo?.VoorstellingstekstNL || null,
                        marketingVoorstellingENG: marketingInfo?.VoorstellingstekstENG || null,
                        marketingBioNL: marketingInfo?.BioNL || null,
                        marketingBioENG: marketingInfo?.BioENG || null,
                        marketingAfbeelding1: marketingInfo?.Afbeelding1 || null,
                        marketingAfbeelding2: marketingInfo?.Afbeelding2 || null,
                        marketingKeywords: marketingInfo?.Keywords || null,
                        similarRaw: performance.LijktOp || [],
                        differentRaw: performance.LijktNietOp || [],
                        nearbyLocationId: locationData.InDeBuurt || null
                    });

                    processedPerformanceIdsForEvent.add(performance.$id);
                }
            }

            const linkedPerformances = performances.filter(p =>
                p.InApp === true &&
                p.eventIds &&
                Array.isArray(p.eventIds) &&
                p.eventIds.includes(eventDoc.$id) &&
                !processedPerformanceIdsForEvent.has(p.$id)
            );

            for (const p of linkedPerformances) {
                 const company = companiesMap.get(p.companyId);
                 const marketingInfo = marketingMap.get(p.$id);

                 const displayDate = localEventInfoMap[eventDoc.Name].dateString || 'Onbekend';

                 allParsedData.push({
                    id: `linked-${p.$id}-${eventDoc.$id}`,
                    eventId: eventDoc.$id,
                    originalPerformanceId: p.$id,
                    locationId: 'generic',
                    date: displayDate,
                    time: 'Ntb',
                    artist: company?.Name || 'Onbekend',
                    title: p.Title || 'Onbekend',
                    location: 'Ntb',
                    url: p.meerInfoUrl || '',
                    event: eventDoc.Name,
                    googleMapsUrl: '',
                    pwycLink: p.pwycLink || '',
                    mapNumber: '',
                    mapImageUrl: eventDoc.mapUrl || '',
                    genre: p.genre || 'N/A',
                    subgenre: p.Subgenre || [],
                    isCalmRoute: false,
                    crowdLevel: '',
                    isTryOut: false,
                    isReservable: false,
                    resTextNL: '',
                    resTextENG: '',
                    resCapacity: 0,
                    resAvailableCapacity: null,
                    artistImageUrl: marketingInfo?.Afbeelding2 || p.imageUrl || '',
                    safetyInfo: {
                        wheelchairAccessible: false,
                        suitableForChildren: p.isChildFriendly || false,
                        dutchLanguage: p.isDutchLanguage || false,
                        englishLanguage: p.isEnglishLanguage || false,
                        dialogueFree: p.isDialogueFree || false,
                        diningFacility: false,
                        hasNGT: false,
                    },
                    marketingCredits: marketingInfo?.Credits || null,
                    marketingCreditsENG: marketingInfo?.CreditsENG || null,
                    marketingVoorstellingNL: marketingInfo?.VoorstellingstekstNL || null,
                    marketingVoorstellingENG: marketingInfo?.VoorstellingstekstENG || null,
                    marketingBioNL: marketingInfo?.BioNL || null,
                    marketingBioENG: marketingInfo?.BioENG || null,
                    marketingAfbeelding1: marketingInfo?.Afbeelding1 || null,
                    marketingAfbeelding2: marketingInfo?.Afbeelding2 || null,
                    marketingKeywords: marketingInfo?.Keywords || null,
                    similarRaw: p.LijktOp || [],
                    differentRaw: p.LijktNietOp || [],
                    nearbyLocationId: null
                 });
            }
        }

        const filteredDataForDisplay = allParsedData;

        const uniqueEventsForDisplay = Object.keys(localEventInfoMap)
            .filter(eventName => eventsInApp.some(e => e.Name === eventName))
            .sort((a,b) => (parseDateForSorting(localEventInfoMap[a]?.dateString) || 0) - (parseDateForSorting(localEventInfoMap[b]?.dateString) || 0));

        const tempGeneralInfoItems = sortedInfo.map(item => ({
            title: { nl: item.NameNl, en: item.NameEng },
            url: { nl: item.MeerInfoNl, en: item.MeerInfoEng },
            imageUrl: item.MeerInfoAfbeelding,
            weergave: item.Weergave || false,
            tekst: { nl: item.TekstNL, en: item.TekstENG }
        }));

        const tempAccessibilityInfoItems = sortedAccessibility.map(item => ({
            title: { nl: item.ToegankelijkheidTitleNl, en: item.ToegankelijkheidTitleEng },
            url: { nl: item.ToegankelijkheidUrlNl, en: item.ToegankelijkheidUrlEng },
            imageUrl: item.ToegankelijkheidAfbeelding,
            weergave: item.Weergave || false,
            tekst: { nl: item.TekstNL, en: item.TekstENG }
        }));

        const tempNewsItems = sortedNews.map(item => ({
            title: { nl: item.NieuwsTitelNl, en: item.NieuwsTitelEng },
            url: { nl: item.NieuwsUrlNl, en: item.NieuwsUrlEng },
            imageUrl: item.NieuwsAfbeelding,
            weergave: item.Weergave || false,
            tekst: { nl: item.TekstNL, en: item.TekstENG },
            createdAt: item.createdAt || item.$createdAt,
            isAdvertisement: item.Advertentie || false
        }))
        .slice(0, 10);

        const tempBenefactorLogos = sponsors.map(item => ({
            url: item.LogoSponsor,
            name: item.Name,
            link: item.Link
        }));

        setError(null);
        setIsOffline(false);
        setTimetableData(filteredDataForDisplay);
        setEventInfoMap(localEventInfoMap);
        setUniqueEvents(uniqueEventsForDisplay);
        setGeneralInfoData(tempGeneralInfoItems);
        setAccessibilityInfoData(tempAccessibilityInfoItems);
        setNewsData(tempNewsItems);
        setBenefactorLogos(tempBenefactorLogos);

        localStorage.setItem('ctfAppwriteCache', JSON.stringify({
            data: filteredDataForDisplay, eventInfoMap: localEventInfoMap, uniqueEvents: uniqueEventsForDisplay,
            generalInfo: tempGeneralInfoItems, accessibilityInfo: tempAccessibilityInfoItems,
            news: tempNewsItems, benefactors: tempBenefactorLogos,
            routes: parsedRoutes,
            timestamp: new Date().getTime()
        }));

        return { generalInfo: tempGeneralInfoItems, accessibilityInfo: tempAccessibilityInfoItems, news: tempNewsItems, timetable: filteredDataForDisplay, routes: parsedRoutes };

    } catch (err) {
        console.error("Fout bij het ophalen van Appwrite gegevens:", err);
        const cached = localStorage.getItem('ctfAppwriteCache');

        if (cached) {
            setIsOffline(true);
            const { generalInfo, accessibilityInfo, news, routes } = JSON.parse(cached);
            return { generalInfo: generalInfo || [], accessibilityInfo: accessibilityInfo || [], news: news || [], timetable: timetableData, routes: routes || [] };
        } else {
            if (err.name === 'AbortError') {
                 setError(translations[language].common.errorTimeout);
            } else {
                 setError(translations[language].common.errorLoading);
            }
        }
        return { generalInfo: [], accessibilityInfo: [], news: [], timetable: timetableData, routes: [] };
    }
  }, [language, timetableData]);

  useEffect(() => {
    const init = async () => {
        let activeData = [];
        let activeRoutes = [];
        let activeGeneralInfo = [];
        let activeAccessibilityInfo = [];
        let activeNews = [];
        let hasCache = false;

        try {
            const cached = localStorage.getItem('ctfAppwriteCache');
            if (cached) {
                const { data, eventInfoMap, uniqueEvents, generalInfo, accessibilityInfo, news, benefactors, routes } = JSON.parse(cached);
                activeData = data || [];
                activeGeneralInfo = generalInfo || [];
                activeAccessibilityInfo = accessibilityInfo || [];
                activeNews = news || [];
                activeRoutes = routes || [];

                setTimetableData(activeData);
                setEventInfoMap(eventInfoMap || {});
                setUniqueEvents(uniqueEvents || []);
                setGeneralInfoData(activeGeneralInfo);
                setAccessibilityInfoData(activeAccessibilityInfo);
                setNewsData(activeNews);
                setBenefactorLogos(benefactors || []);
                setRoutesData(activeRoutes);

                hasCache = true;
                setLoading(false);
            } else {
                setLoading(true);
            }
        } catch (e) {
            console.error("Kon cache niet laden, cache wordt gewist", e);
            localStorage.clear();
            setLoading(true);
        }

        const processUrlParams = (data, routes, generalInfo, accessibilityInfo, news) => {
            const urlParams = new URLSearchParams(window.location.search);
            const favoriteIndicesParam = urlParams.get('fav_indices');
            const favoriteIdsParam = urlParams.get('favorites');
            const path = window.location.pathname;
            const pathSegments = path.split('/').filter(Boolean);

            let performancesToImport = [];

            if (favoriteIndicesParam) {
                try {
                    const decodedIndices = atob(favoriteIndicesParam).split(',').map(Number);
                    performancesToImport = decodedIndices.map(index => data[index]).filter(Boolean);
                } catch (e) { console.error("Error decoding favorite indices", e); }
            } else if (favoriteIdsParam) {
                try {
                    const decodedIds = atob(favoriteIdsParam).split(',');
                    performancesToImport = data.filter(p => decodedIds.includes(p.id));
                } catch (e) { console.error("Error decoding favorite IDs", e); }
            }

            if (performancesToImport.length > 0) {
                setSharedFavoritesForImport(performancesToImport);
                setShowImportPopup(true);
            } else if (pathSegments.length > 0) {
                const slug = pathSegments[0];
                const performance = data.find(p => slugify(p.artist || p.title) === slug);

                if (performance) {
                    setActivePerformance(performance);
                    setActiveInfoPage(null);
                    setActiveRoute(null);
                    setIsInitialLoad(false);
                    setShowStickyHeader(true);
                } else {
                    const routeItem = routes.find(r => slugify(r.title) === slug || slugify(r.titleEng) === slug);
                    if (routeItem) {
                        setActiveRoute(routeItem);
                        setActivePerformance(null);
                        setActiveInfoPage(null);
                        setIsInitialLoad(false);
                        setShowStickyHeader(true);
                        if (routeItem.event) setSelectedEvent(routeItem.event);
                    } else {
                        const allInfo = [...generalInfo, ...accessibilityInfo, ...news];
                        const infoItem = allInfo.find(i => slugify(i.title[language] || i.title.nl) === slug);

                        if (infoItem) {
                            setActiveInfoPage(infoItem);
                            setActivePerformance(null);
                            setActiveRoute(null);
                            setIsInitialLoad(false);
                            setShowStickyHeader(true);
                        } else {
                            const hash = window.location.hash.substring(1);
                            if (hash && hash !== '#') {
                                if (hash === 'favorites') handleViewChange('favorites');
                                else if (hash === 'friends-favorites') handleViewChange('friends-favorites');
                                else if (hash === 'more-info') handleViewChange('more-info');
                                else if (hash === 'accessibility') handleViewChange('accessibility');
                                else handleViewChange('timetable', decodeURIComponent(hash));
                            }
                        }
                    }
                }
            } else {
                const hash = window.location.hash.substring(1);
                if (hash && hash !== '#') {
                    if (hash === 'favorites') handleViewChange('favorites');
                    else if (hash === 'friends-favorites') handleViewChange('friends-favorites');
                    else if (hash === 'more-info') handleViewChange('more-info');
                    else if (hash === 'accessibility') handleViewChange('accessibility');
                    else handleViewChange('timetable', decodeURIComponent(hash));
                } else {
                    try {
                        window.history.replaceState({ view: 'initial' }, '', window.location.pathname + '#');
                    } catch(e) { console.warn("Could not update history state:", e); }
                }
            }
        };

        if (hasCache) {
            processUrlParams(activeData, activeRoutes, activeGeneralInfo, activeAccessibilityInfo, activeNews);
        }

        fetchDataFromAppwrite().then((result) => {
            if (!hasCache) {
                setLoading(false);
                if (result) {
                    processUrlParams(result.timetable, result.routes, result.generalInfo, result.accessibilityInfo, result.news);
                }
            }

            try {
                const dismissed = localStorage.getItem('ctfAppDownloadPopupDismissed');
                const isProbablyAndroid = /Android/i.test(navigator.userAgent);
                const isProbablyIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                if (!dismissed && (isProbablyAndroid || isProbablyIOS)) {
                    setTimeout(() => setShowAppDownloadPopup(true), 3000);
                }
            } catch(e) {}
        });
    };

    init();

    const intervalId = setInterval(fetchDataFromAppwrite, 120000);

    return () => clearInterval(intervalId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleImportFavorites = () => {
      const importedIds = new Set(sharedFavoritesForImport.map(p => p.id));
      setFriendsFavorites(importedIds);
      localStorage.setItem('ctfFriendsFavorites', JSON.stringify(Array.from(importedIds)));
      setShowImportPopup(false);
      setSharedFavoritesForImport([]);
      toast.success(translations[language].common.importSuccess);
      handleViewChange('friends-favorites');
  };

  const openSettingsWithFallback = useCallback(() => {
      try {
        if (window.AndroidBridge?.openExactAlarmSettings) {
            window.AndroidBridge.openExactAlarmSettings();
        } else if (window.AndroidBridge?.openAppSettings) {
            window.AndroidBridge.openAppSettings();
        }
      } catch (e) {
        console.error("Failed to open Android settings:", e);
      }
      closeMessageBox();
  }, [closeMessageBox]);

  const showPermissionDialog = useCallback(() => {
      showMessageBox(
        translations[language].common.exactAlarmPermissionNeededBody,
        [
          {
            text: translations[language].common.openSettings,
            onClick: openSettingsWithFallback,
            className: 'bg-[#20747f] hover:bg-[#1a5b64] text-white'
          },
          {
            text: translations[language].common.later,
            onClick: closeMessageBox,
            className: 'bg-gray-200 hover:bg-gray-300 text-gray-800'
          }
        ],
        translations[language].common.exactAlarmPermissionNeededTitle
      );
  }, [language, showMessageBox, closeMessageBox, openSettingsWithFallback]);

  useEffect(() => {
    const checkPermissionsOnLoad = async () => {
      try {
        if (window.AndroidBridge && !permissionRequestDismissed && !loading) {
          const canSchedule = await window.AndroidBridge.canScheduleExactAlarms();
          if (!canSchedule) {
            showMessageBox(
              translations[language].common.exactAlarmPermissionNeededBody,
              [
                {
                  text: translations[language].common.openSettings,
                  onClick: openSettingsWithFallback,
                  className: 'bg-[#20747f] hover:bg-[#1a5b64] text-white'
                },
                {
                  text: translations[language].common.dontAskAgain,
                  onClick: () => {
                    localStorage.setItem('ctfNotificationPermissionDismissed', 'true');
                    setPermissionRequestDismissed(true);
                    closeMessageBox();
                  },
                  className: 'bg-gray-500 hover:bg-gray-600 text-white'
                },
                {
                  text: translations[language].common.later,
                  onClick: closeMessageBox,
                  className: 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }
              ],
              translations[language].common.exactAlarmPermissionNeededTitle
            );
          }
        }
      } catch (e) {
        console.error("Error checking Android permissions:", e);
      }
    };
    const timer = setTimeout(checkPermissionsOnLoad, 1000);
    return () => clearTimeout(timer);
  }, [loading, permissionRequestDismissed, language, showMessageBox, closeMessageBox, openSettingsWithFallback]);

  const scheduleActualNotification = useCallback(async (item) => {
    try {
        const notificationTime = parseDateForSorting(item.date);
        if (isNaN(notificationTime.getTime()) || !item.time) return;

        const [h, m] = item.time.split(':');
        notificationTime.setHours(h, m, 0, 0);

        const reminderTime = new Date(notificationTime.getTime() - 20 * 60 * 1000);
        const now = new Date();
        const fullTitle = item.artist ? `${item.artist} - ${item.title}` : item.title;

        if (reminderTime <= now) {
            if (item.crowdLevel?.toLowerCase() === 'geannuleerd' || item.crowdLevel?.toLowerCase() === 'cancelled') {
                const title = translations[language].common.cancellationNotificationTitle;
                const body = translations[language].common.cancellationNotificationBody.replace('%s', fullTitle);
                if (window.AndroidBridge?.scheduleNativeNotification) {
                    const appUrl = `${window.location.origin}${window.location.pathname}#${encodeURIComponent(item.event)}`;
                    window.AndroidBridge.scheduleNativeNotification(title, body, Date.now(), `cancellation-${item.id}`, appUrl);
                } else if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(title, { body });
                }
            }
            return;
        }

        const title = translations[language].common.notificationTitle;
        const body = translations[language].common.notificationBody.replace('%s', fullTitle).replace('%s', item.location);
        const notificationId = item.id;

        if (window.AndroidBridge?.scheduleNativeNotification) {
            const canSchedule = await window.AndroidBridge.canScheduleExactAlarms();
            if (!canSchedule) {
                if (!permissionRequestDismissed) showPermissionDialog();
                return;
            }
            window.AndroidBridge.scheduleNativeNotification(title, body, reminderTime.getTime(), notificationId, item.url || '');
        } else if ('Notification' in window && Notification.permission === 'granted') {
            const delay = reminderTime.getTime() - now.getTime();
            const MAX_TIMEOUT = 2147483647;

            if (delay > 0) {
                if (delay > MAX_TIMEOUT) {
                    return;
                }

                if(notificationTimeouts.current[notificationId]) clearTimeout(notificationTimeouts.current[notificationId]);
                const timeoutId = setTimeout(() => {
                    new Notification(title, { body });
                    delete notificationTimeouts.current[notificationId];
                }, delay);
                notificationTimeouts.current[notificationId] = timeoutId;
            }
        }
    } catch (e) {
        console.error("Failed to schedule notification:", e);
    }
  }, [language, showPermissionDialog, permissionRequestDismissed]);

  const cancelScheduledNotification = useCallback((performanceId) => {
    try {
        if (window.AndroidBridge?.cancelNativeNotification) {
            window.AndroidBridge.cancelNativeNotification(performanceId);
        }
        if (notificationTimeouts.current[performanceId]) {
            clearTimeout(notificationTimeouts.current[performanceId]);
            delete notificationTimeouts.current[performanceId];
        }
    } catch (e) {
        console.error("Failed to cancel notification:", e);
    }
  }, []);

  const scheduleStatusNotification = useCallback((item, type) => {
    try {
        let title, body;
        const fullTitle = item.artist ? `${item.artist} - ${item.title}` : item.title;

        if (type === 'cancelled') {
            title = translations[language].common.cancellationNotificationTitle;
            body = translations[language].common.cancellationNotificationBody.replace('%s', fullTitle);
        } else if (type === 'full') {
            title = translations[language].common.fullNotificationTitle;
            body = translations[language].common.fullNotificationBody.replace('%s', fullTitle);
        } else {
            return;
        }

        const notificationId = `${type}-${item.id}-${new Date().getTime()}`;
        const scheduleTime = Date.now() + 1000;

        if (window.AndroidBridge?.scheduleNativeNotification) {
            const appUrl = `${window.location.origin}${window.location.pathname}#${encodeURIComponent(item.event)}`;
            window.AndroidBridge.scheduleNativeNotification(title, body, scheduleTime, notificationId, appUrl);
        } else if ('Notification' in window && Notification.permission === 'granted') {
            setTimeout(() => {
                new Notification(title, { body, tag: notificationId });
            }, 1000);
        }
    } catch (e) {
        console.error("Failed to schedule status notification:", e);
    }
  }, [language]);

  useEffect(() => {
    if (loading || prevTimetableDataRef.current.length === 0 || favorites.size === 0) {
        return;
    }

    const prevDataMap = new Map(prevTimetableDataRef.current.map(item => [item.id, item]));
    const favoritesToRemove = new Set();

    favorites.forEach(favId => {
        const currentItem = timetableData.find(item => item.id === favId);
        const prevItem = prevDataMap.get(favId);

        if (currentItem && prevItem) {
            const currentStatus = currentItem.crowdLevel?.toLowerCase();
            const prevStatus = prevItem.crowdLevel?.toLowerCase();

            if (currentStatus !== prevStatus) {
                if (currentStatus === 'geannuleerd' || currentStatus === 'cancelled') {
                    scheduleStatusNotification(currentItem, 'cancelled');
                    cancelScheduledNotification(currentItem.id);
                    favoritesToRemove.add(favId);
                }
                if (currentStatus === 'vol' || currentStatus === 'full') {
                    scheduleStatusNotification(currentItem, 'full');
                    cancelScheduledNotification(currentItem.id);
                    favoritesToRemove.add(favId);
                }
            }
        }
    });

    if (favoritesToRemove.size > 0) {
        setFavorites(prevFavorites => {
            const newFavorites = new Set(prevFavorites);
            favoritesToRemove.forEach(id => newFavorites.delete(id));
            localStorage.setItem('ctfTimetableFavorites', JSON.stringify([...newFavorites]));
            return newFavorites;
        });
    }
  }, [timetableData, favorites, loading, scheduleStatusNotification, cancelScheduledNotification]);

  useEffect(() => {
      prevTimetableDataRef.current = timetableData;
  }, [timetableData]);

  const processAndScheduleGeneralNotifications = useCallback(async (notifications) => {
    try {
        if (!Array.isArray(notifications)) {
            console.error("General notifications data is not an array:", notifications);
            return;
        }

        let hasPermission = true;
        if (window.AndroidBridge) {
            hasPermission = await window.AndroidBridge.canScheduleExactAlarms();
            if (!hasPermission && !permissionRequestDismissed) {
                showPermissionDialog();
                return;
            }
        } else if (!('Notification' in window) || Notification.permission !== 'granted') {
            hasPermission = false;
        }

        const newlyScheduledIds = new Set();
        const now = new Date();
        const MAX_TIMEOUT = 2147483647;

        for (const notif of notifications) {
            if (!notif.id || !notif.date) continue;
            if (scheduledCustomNotifications.has(notif.id)) continue;
            const notificationDateTime = new Date(notif.date);
            if (isNaN(notificationDateTime.getTime()) || notificationDateTime <= now) continue;
            if (!hasPermission) continue;

            const title = translations[language].common.genericNotificationTitle;
            const body = language === 'nl' ? notif.text_nl : notif.text_en;
            if (!body) continue;

            if (window.AndroidBridge?.scheduleNativeNotification) {
                window.AndroidBridge.scheduleNativeNotification(title, body, notificationDateTime.getTime(), notif.id, notif.url || '');
            } else {
                const delay = notificationDateTime.getTime() - now.getTime();

                if (delay > MAX_TIMEOUT) {
                    continue;
                }

                setTimeout(() => { new Notification(title, { body }); }, delay);
            }
            newlyScheduledIds.add(notif.id);
        }

        if (newlyScheduledIds.size > 0) {
            setScheduledCustomNotifications(prev => {
                const newSet = new Set([...prev, ...newlyScheduledIds]);
                localStorage.setItem('ctfScheduledCustomNotifications', JSON.stringify([...newSet]));
                return newSet;
            });
        }
    } catch (e) {
        console.error("Failed to process general notifications:", e);
    }
  }, [language, scheduledCustomNotifications, permissionRequestDismissed, showPermissionDialog]);

  useEffect(() => {
    const gistNotificationsUrl = 'https://ldegroen.github.io/ctf-notificaties/notifications.json';
    const fetchAndProcessGistNotifications = async () => {
      if (!gistNotificationsUrl) return;
      try {
        const response = await fetch(gistNotificationsUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const json = await response.json();
        processAndScheduleGeneralNotifications(json);
      } catch (err) {
        console.error("Error fetching or processing Gist notifications:", err);
      }
    };
    if (!loading) fetchAndProcessGistNotifications();
  }, [loading, processAndScheduleGeneralNotifications]);

  useEffect(() => {
    if (selectedEvent && eventInfoMap[selectedEvent]) {
      const info = eventInfoMap[selectedEvent];
      setCurrentSponsorInfo({ logoUrl: info.sponsorLogo || '', eventName: selectedEvent });
    } else {
      setCurrentSponsorInfo(null);
    }
  }, [selectedEvent, eventInfoMap]);

  const datesForCurrentSelectedEvent = useMemo(() => {
    if (currentView !== 'timetable' || !selectedEvent) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let eventPerformances = timetableData.filter(item => {
        if (item.event !== selectedEvent || !item.date) return false;
        const performanceDate = parseDateForSorting(item.date);
        return performanceDate && performanceDate >= today;
    });

    const filtersAreActive = iconFilters.size > 0 || genreFilters.size > 0;
    if (filtersAreActive) {
        eventPerformances = eventPerformances.filter(item => {
            const hasIconMatch = iconFilters.size === 0 || [...iconFilters].every(filterKey => item.safetyInfo[filterKey]);
            const hasGenreMatch = genreFilters.size === 0 || (item.genre && item.genre.split(',').map(g => g.trim()).some(g => genreFilters.has(g)));
            return hasIconMatch && hasGenreMatch;
        });
    }

    eventPerformances = eventPerformances.filter(item =>
        !(item.location && item.location.toLowerCase().includes('utrecht centraal'))
    );

    return [...new Set(eventPerformances.map(item => item.date))]
           .sort((a, b) => parseDateForSorting(a) - parseDateForSorting(b));
  }, [timetableData, selectedEvent, currentView, iconFilters, genreFilters]);

  const toggleFavorite = useCallback((itemObject, e) => {
    e.stopPropagation();

    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(itemObject.id)) {
        newFavorites.delete(itemObject.id);
        cancelScheduledNotification(itemObject.id);
      } else {
        newFavorites.add(itemObject.id);
        scheduleActualNotification(itemObject);
      }

      localStorage.setItem('ctfTimetableFavorites', JSON.stringify([...newFavorites]));

      if (window.AndroidBridge && window.AndroidBridge.saveFavoritesForReboot) {
        const favoritesToSave = [...newFavorites].map(favId => timetableData.find(item => item.id === favId)).filter(Boolean);
        window.AndroidBridge.saveFavoritesForReboot(JSON.stringify(favoritesToSave));
      }

      return newFavorites;
    });
  }, [scheduleActualNotification, cancelScheduledNotification, timetableData]);

  const toggleRouteFavorites = useCallback((route) => {
      if (!route || !route.executionIds) return;

      const idsToAdd = route.executionIds;
      const allFavorited = idsToAdd.every(id => favorites.has(id));

      setFavorites(prev => {
          const newFavorites = new Set(prev);

          idsToAdd.forEach(id => {
              const item = timetableData.find(p => p.id === id);
              if (item) {
                  if (allFavorited) {
                      newFavorites.delete(id);
                      cancelScheduledNotification(id);
                  } else {
                      if (!newFavorites.has(id)) {
                          newFavorites.add(id);
                          scheduleActualNotification(item);
                      }
                  }
              }
          });

          localStorage.setItem('ctfTimetableFavorites', JSON.stringify([...newFavorites]));
           if (window.AndroidBridge && window.AndroidBridge.saveFavoritesForReboot) {
                const favoritesToSave = [...newFavorites].map(favId => timetableData.find(item => item.id === favId)).filter(Boolean);
                window.AndroidBridge.saveFavoritesForReboot(JSON.stringify(favoritesToSave));
           }
          return newFavorites;
      });

      toast(allFavorited
        ? translations[language].common.routeRemoved
        : translations[language].common.routeAdded
      );

  }, [favorites, timetableData, scheduleActualNotification, cancelScheduledNotification, showMessageBox, language]);

  useEffect(() => {
    if (timetableData.length > 0 && favorites.size > 0) {
        const dataMap = new Map(timetableData.map(item => [item.id, item]));
        favorites.forEach(favId => {
            const item = dataMap.get(favId);
            if (item) {
                scheduleActualNotification(item);
            }
        });
    }
  }, [timetableData, favorites, scheduleActualNotification]);

  const addToGoogleCalendar = useCallback((e, title, date, time, location) => {
    e.stopPropagation();
    const dateObj = parseDateForSorting(date);
    if (isNaN(dateObj.getTime()) || !time) {
      console.error("Invalid date or time for calendar event:", date, time);
      return;
    }

    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const day = dateObj.getDate();

    const [startHour, startMinute] = time.split(':').map(Number);

    const startDate = new Date(year, month, day, startHour, startMinute);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

    const formatForGoogle = (d) => {
        const yyyy = d.getFullYear();
        const MM = String(d.getMonth() + 1).padStart(2, '0');
        const DD = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        return `${yyyy}${MM}${DD}T${hh}${mm}${ss}`;
    };

    const startDateString = formatForGoogle(startDate);
    const endDateString = formatForGoogle(endDate);

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDateString}/${endDateString}&ctz=${timezone}&details=${encodeURIComponent('Locatie: ' + location)}&location=${encodeURIComponent(location)}&sf=true&output=xml`;
    window.open(url, '_blank');
  }, []);

  const handleIconMouseEnter = useCallback((e, content) => {
    setCustomTooltipContent(content);
    setCustomTooltipPosition({ x: e.clientX + 15, y: e.clientY + 15 });
    setShowCustomTooltip(true);
  }, []);

  const handleIconMouseLeave = useCallback(() => setShowCustomTooltip(false), []);

  const handleCookieChoice = (choice) => {
    localStorage.setItem('cookieConsent', choice);
    setCookieConsent(choice);
    if (choice === 'all' && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX') {
        try {
            ReactGA.initialize(GA_MEASUREMENT_ID);
            console.log("Marketing en analytics cookies zijn nu ingeschakeld en GA is geïnitialiseerd.");
            trackEvent('Cookie Consent', 'Accept All', '');
        } catch(e) {
            console.error("Fout bij initialiseren Google Analytics na cookie keuze:", e);
        }
    } else if (choice === 'functional') {
        trackEvent('Cookie Consent', 'Accept Functional', '');
    } else if (choice === 'declined') {
        trackEvent('Cookie Consent', 'Decline All', '');
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      if (event.key === 'Escape') {
        const isModalOpen = showPopup || showPrivacyPolicy || messageBoxConfig.show || showExportModal || showImportPopup;
        if (!isModalOpen && (!isInitialLoad || activePerformance || activeInfoPage || activeRoute)) {
          returnToInitialView();
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [showPopup, showPrivacyPolicy, messageBoxConfig.show, showExportModal, showImportPopup, isInitialLoad, activePerformance, activeInfoPage, activeRoute, returnToInitialView]);

  const renderMainContent = () => {
      if (activeInfoPage) {
          return (
              <div className={`transition-opacity duration-300 ${isContentVisible ? 'opacity-100' : 'opacity-0'}`}>
                  <InfoDetailPage
                      item={activeInfoPage}
                      language={language}
                      translations={translations}
                  />
              </div>
          );
      }

      if (activeRoute) {
          const routeTitle = language === 'nl' ? activeRoute.title : (activeRoute.titleEng || activeRoute.title);
          const routeText = language === 'nl' ? activeRoute.text : (activeRoute.textEng || activeRoute.text);
          const routePerformances = timetableData.filter(p => activeRoute.executionIds.includes(p.id))
                .sort((a, b) => parseDateForSorting(a.date) - parseDateForSorting(b.date) || a.time.localeCompare(b.time));

          const groupedByDate = routePerformances.reduce((acc, item) => {
             (acc[item.date] = acc[item.date] || []).push(item);
             return acc;
          }, {});

          const subGroups = Object.keys(groupedByDate)
             .sort((a, b) => parseDateForSorting(a) - parseDateForSorting(b))
             .map(date => ({
                 subGroupTitle: date,
                 items: groupedByDate[date].sort((a, b) => a.time.localeCompare(b.time))
             }));

          const isRouteFavorited = activeRoute.executionIds.length > 0 && activeRoute.executionIds.every(id => favorites.has(id));

          return (
              <div className={`transition-opacity duration-300 ${isContentVisible ? 'opacity-100' : 'opacity-0'} pb-20`}>
                  <div className="max-w-4xl mx-auto text-white mb-8">
                      {activeRoute.image && (
                          <img src={activeRoute.image} alt={routeTitle} className="w-full h-64 md:h-96 object-cover rounded-xl shadow-lg mb-6" />
                      )}
                      <h2 className="text-3xl font-bold mb-4 text-center">{routeTitle}</h2>
                      <div className="prose prose-invert max-w-none mb-6 text-center">
                         <p>{routeText}</p>
                      </div>

                      <div className="flex justify-center mb-8">
                          <button
                            onClick={() => toggleRouteFavorites(activeRoute)}
                            className={`px-6 py-3 rounded-lg font-bold text-lg shadow-lg flex items-center gap-2 transition-transform hover:scale-105 ${isRouteFavorited ? 'bg-red-500 text-white' : 'bg-white text-[#20747f]'}`}
                          >
                             <svg xmlns="https://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                             </svg>
                             {isRouteFavorited ? translations[language].common.removeRouteFromFavorites : translations[language].common.addRouteToFavorites}
                          </button>
                      </div>
                  </div>

                  <TimetableDisplay
                      loading={false}
                      error={null}
                      displayedData={[{ groupTitle: routeTitle, subGroups: subGroups }]}
                      currentView="route-detail"
                      favorites={favorites}
                      toggleFavorite={toggleFavorite}
                      addToGoogleCalendar={addToGoogleCalendar}
                      openContentPopup={openContentPopup}
                      language={language}
                      handleIconMouseEnter={handleIconMouseEnter}
                      handleIconMouseLeave={handleIconMouseLeave}
                      translations={translations}
                      selectedEvent={null}
                      searchTerm=""
                      showMessageBox={showMessageBox}
                      selectedDate={null}
                      safetyIcons={safetyIcons}
                      onNavigate={handleNavigateToPerformance}
                      onReservationClick={openReservationModal}
                  />
              </div>
          );
      }

      if (activePerformance) {
          return (
              <div className={`transition-opacity duration-300 ${isContentVisible ? 'opacity-100' : 'opacity-0'}`}>
                  <PerformanceDetailPage
                      performance={activePerformance}
                      allPerformances={timetableData}
                      language={language}
                      translations={translations}
                      onNavigateToEvent={(view, event) => handleViewChange(view, event)}
                      onReservationClick={openReservationModal}
                  />
              </div>
          );
      }

      if (loading && isInitialLoad) {
        return (
            <div className="flex flex-col items-center gap-4 p-4 pt-8 animate-pulse">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white/20 rounded-xl w-full md:w-[384px] overflow-hidden shadow-lg">
                        <div className="h-6 bg-white/30 rounded mx-4 mt-4 mb-2 w-1/3"></div>
                        <div className="p-4 space-y-3">
                            <div className="h-7 bg-white/30 rounded w-1/4"></div>
                            <div className="h-5 bg-white/30 rounded w-3/4"></div>
                            <div className="h-4 bg-white/30 rounded w-1/2"></div>
                            <div className="h-4 bg-white/20 rounded w-full mt-4"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
      }

      if (currentView === 'more-info') {
          return (
              <div className={`transition-opacity duration-300 ${isContentVisible ? 'opacity-100' : 'opacity-0'}`}>
                  <MoreInfoPage
                      generalInfoItems={generalInfoData}
                      openContentPopup={openContentPopup}
                      language={language}
                      translations={translations}
                  />
              </div>
          );
      }

      if (currentView === 'accessibility') {
          return (
              <div className={`transition-opacity duration-300 ${isContentVisible ? 'opacity-100' : 'opacity-0'}`}>
                  <AccessibilityPage
                      accessibilityInfoItems={accessibilityInfoData}
                      openContentPopup={openContentPopup}
                      language={language}
                      translations={translations}
                  />
              </div>
          );
      }

      const isFavorites = currentView === 'favorites';
      const isFriendsFavorites = currentView === 'friends-favorites';

      let currentViewMode = 'card';
      let setViewModeFunction = () => {};
      if (isFavorites) {
        currentViewMode = favoritesViewMode;
        setViewModeFunction = setFavoritesViewMode;
      } else if (isFriendsFavorites) {
        currentViewMode = friendsFavoritesViewMode;
        setViewModeFunction = setFriendsFavoritesViewMode;
      } else if (currentView === 'timetable') {
        currentViewMode = eventViewMode;
        setViewModeFunction = setEventViewMode;
      }

      return (
        <div className={`transition-opacity duration-300 ${isContentVisible ? 'opacity-100' : 'opacity-0'}`}>
          {(selectedEvent || isFavorites || isFriendsFavorites) && (
              <>
                {currentView === 'friends-favorites' && friendsFavorites.size > 0 ? (
                    <div className="flex flex-col items-center justify-center mt-12 mb-8 text-center">
                        <button
                            onClick={handleClearFriendsFavorites}
                            className="px-6 py-3 bg-[#1a5b64] text-white rounded-lg shadow-md hover:bg-[#2e9aaa] transition-all duration-200 text-base font-semibold"
                        >
                            {translations[language].common.removeFriendsFavorites}
                        </button>
                    </div>
                ) : (
                    <SponsorDisplay ref={sponsorRef} sponsorInfo={currentSponsorInfo} language={language} translations={translations} />
                )}

                {currentView === 'timetable' && !searchTerm && eventViewMode === 'card' && (
                    <DateNavigation datesForCurrentSelectedEvent={datesForCurrentSelectedEvent} selectedDate={selectedDate} setSelectedDate={setSelectedDate} setSearchTerm={setSearchTerm} translations={translations} language={language} selectedEvent={selectedEvent} timetableData={timetableData} />
                )}

                {(isFavorites || isFriendsFavorites || (currentView === 'timetable' && selectedEvent)) && (
                    <div className="flex flex-col items-center gap-4 my-8 w-full">
                        <div className="flex flex-wrap justify-center items-center gap-4">
                            <EventViewSwitcher
                                viewMode={currentViewMode}
                                setViewMode={setViewModeFunction}
                                language={language}
                                translations={translations}
                                handleAnimatedUpdate={handleAnimatedUpdate}
                                hasRoutes={currentView === 'timetable' && selectedEvent && routesData.some(r => r.event === selectedEvent)}

                                onOpenRoutes={() => {
                                    const eventRoutes = routesData.filter(r => r.event === selectedEvent);
                                    const allDates = new Set();
                                    eventRoutes.forEach(r => {
                                        if (r.dates && Array.isArray(r.dates)) {
                                            r.dates.forEach(d => allDates.add(d));
                                        }
                                    });
                                    const uniqueDates = Array.from(allDates).sort((a, b) => parseDateForSorting(a) - parseDateForSorting(b));

                                    const openRouteList = (filteredRoutes) => {
                                        openContentPopup('routeSelection', {
                                            routes: filteredRoutes,
                                            onSelectRoute: (route) => {
                                                closePopup();
                                                handleAnimatedUpdate(() => {
                                                    setActiveRoute(route);
                                                    window.scrollTo({ top: 0, behavior: 'auto' });
                                                });
                                            }
                                        });
                                    };

                                    if (uniqueDates.length > 0) {
                                        openContentPopup('routeDateSelection', {
                                            dates: uniqueDates,
                                            onSelectDate: (selectedDate) => {
                                                const routesForDate = eventRoutes.filter(r => r.dates && r.dates.includes(selectedDate));
                                                openRouteList(routesForDate);
                                            }
                                        });
                                    } else {
                                        openRouteList(eventRoutes);
                                    }
                                }}
                            />
                      {isFavorites && favorites.size > 0 && (
                        <button onClick={() => {
                            setShowExportModal(true);
                            trackEvent('Sharing', 'Open Export Modal', '');
                        }} className="px-4 py-2 rounded-lg font-semibold bg-green-500 hover:bg-green-600 text-white flex items-center gap-2">
                             <svg xmlns="https://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
                             {translations[language].common.exportFavorites}
                        </button>
                      )}
                        </div>

                        {currentView === 'timetable' && selectedEvent && (
                            <button
                                onClick={() => openContentPopup('text', {
                                    title: translations[language].payWhatYouCan.title,
                                    text: translations[language].payWhatYouCan.text
                                })}
                                className="px-6 py-3 rounded-lg font-semibold transition-all duration-200 bg-[#9f4493] text-black shadow-md hover:opacity-80 flex items-center gap-2"
                            >
                                <svg xmlns="https://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                                {translations[language].common.howPWYCWorks}
                            </button>
                        )}
                    </div>
                )}

                {currentViewMode === 'card' ? (
                   <TimetableDisplay
                      loading={loading && !isInitialLoad}
                      error={error}
                      displayedData={formattedData}
                      currentView={currentView}
                      favorites={favorites}
                      toggleFavorite={toggleFavorite}
                      addToGoogleCalendar={addToGoogleCalendar}
                      openContentPopup={openContentPopup}
                      language={language}
                      handleIconMouseEnter={handleIconMouseEnter}
                      handleIconMouseLeave={handleIconMouseLeave}
                      translations={translations}
                      selectedEvent={selectedEvent}
                      searchTerm={searchTerm}
                      showMessageBox={showMessageBox}
                      selectedDate={selectedDate}
                      safetyIcons={safetyIcons}
                      iconFilters={iconFilters}
                      genreFilters={genreFilters}
                      onNavigate={handleNavigateToPerformance}
                      onReservationClick={openReservationModal}
                  />
                ) : (
                   <BlockTimetable allData={timetableData} favorites={favorites} friendsFavorites={friendsFavorites} toggleFavorite={toggleFavorite} selectedEvent={selectedEvent} openContentPopup={openContentPopup} translations={translations} language={language} isFavoritesView={isFavorites} isFriendsView={isFriendsFavorites} />
                )}

                {currentView !== 'block' && selectedEvent && eventInfoMap[selectedEvent]?.mapUrl && !loading && !error && (
                    <div className="mt-8 mb-8 w-full max-w-sm px-4 cursor-pointer mx-auto" onClick={() => {
                        openContentPopup('image', eventInfoMap[selectedEvent].mapUrl);
                        trackEvent('Navigation', 'Open Map', selectedEvent);
                    }}>
                        <h2 className="text-center text-white text-2xl font-bold mb-4">{translations[language].common.mapTitle.replace('%s', selectedEvent)}</h2>
                        <img src={eventInfoMap[selectedEvent].mapUrl} alt={`Afbeelding van Kaart ${selectedEvent}`} className="w-full h-auto rounded-lg shadow-lg border-4 border-white/50 hover:border-white transition-all"/>
                    </div>
                )}
              </>
          )}
        </div>
      );
  };

  const handleClearFriendsFavorites = useCallback(() => {
      setFriendsFavorites(new Set());
      localStorage.removeItem('ctfFriendsFavorites');
      returnToInitialView();
  }, [returnToInitialView]);

  const handleStickyLogoClick = useCallback(() => {
    returnToInitialView();
  }, [returnToInitialView]);

  useEffect(() => {
      const handlePopState = (event) => {
          const path = window.location.pathname;
          const pathSegments = path.split('/').filter(Boolean);

          if (pathSegments.length > 0) {
              const slug = pathSegments[0];
              const performance = timetableData.find(p => slugify(p.artist || p.title) === slug);

              if (performance) {
                  setActivePerformance(performance);
                  setActiveInfoPage(null);
                  setIsInitialLoad(false);
                  setShowStickyHeader(true);
              } else {
                  const allInfo = [...generalInfoData, ...accessibilityInfoData, ...newsData];
                  const infoItem = allInfo.find(i => slugify(i.title[language] || i.title.nl) === slug);

                  if (infoItem) {
                       setActiveInfoPage(infoItem);
                       setActivePerformance(null);
                       setIsInitialLoad(false);
                       setShowStickyHeader(true);
                  } else {
                       returnToInitialView();
                  }
              }
          } else if (!event.state || event.state.view === 'initial' || !window.location.hash) {
              returnToInitialView();
          } else if (event.state.view === 'detail') {
              handleAnimatedUpdate(() => {
                setActivePerformance(null);
                setActiveInfoPage(null);
                setIsInitialLoad(false);
                setCurrentView(event.state.currentView || 'timetable');
                setSelectedEvent(event.state.event);
                if(event.state.currentView === 'timetable') setEventViewMode(event.state.viewMode || 'card');
                setShowStickyHeader(true);
              });
          }
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
          window.removeEventListener('popstate', handlePopState);
      };
  }, [returnToInitialView, handleAnimatedUpdate, timetableData, generalInfoData, accessibilityInfoData, newsData, handleViewChange, language]);

  useEffect(() => {
    const scriptId = 'react-ga4-script';
    if (document.getElementById(scriptId)) return;
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = "https://cdn.jsdelivr.net/npm/react-ga4@2.1.0/dist/react-ga4.min.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <>
    <style>{`
        #app-container.grayscale { filter: grayscale(100%); }
        #app-container.high-contrast { filter: contrast(175%); }
        #app-container.negative-contrast { filter: invert(100%) hue-rotate(180deg); }
        #app-container.negative-contrast img { filter: invert(100%) hue-rotate(180deg); }
        #app-container.underline-links a, #app-container.underline-links button { text-decoration: underline !important; }
        #app-container.readable-font { font-family: 'Arial', sans-serif !important; }
        #app-container.readable-font h1, #app-container.readable-font h2, #app-container.readable-font h3 { font-family: 'Arial', sans-serif !important; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.5s ease-in-out; }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
    `}</style>
    <div id="app-container" className="min-h-screen bg-[#20747f] font-sans text-gray-100 flex flex-col items-center relative overflow-x-hidden">

      <StickyHeader
          isVisible={showStickyHeader || !!activePerformance || !!activeInfoPage || !!activeRoute}
          uniqueEvents={uniqueEvents}
          handleEventClick={(e) => handleViewChange('timetable', e)}
          handleFavoritesClick={() => handleViewChange('favorites')}
          handleFriendsFavoritesClick={() => handleViewChange('friends-favorites')}
          handleMoreInfoClick={() => handleViewChange('more-info')}
          handleAccessibilityClick={() => handleViewChange('accessibility')}
          hasFriendsFavorites={friendsFavorites.size > 0}
          onLogoClick={handleStickyLogoClick}
          selectedEvent={selectedEvent}
          currentView={currentView}
          language={language}
          handleLanguageChange={handleLanguageChange}
          translations={translations}
          openContentPopup={openContentPopup}
          isInitialLoad={isInitialLoad && !activePerformance && !activeInfoPage && !activeRoute}
      />

      <OfflineIndicator
        isOffline={isOffline}
        language={language}
        translations={translations}
        onRetry={fetchDataFromAppwrite}
      />

      <div className="w-full flex-grow flex flex-col">
          <div className="relative min-h-[95vh]">
            <div className={`absolute inset-0 transition-all duration-500 ease-in-out ${isInitialLoad && !activePerformance && !activeInfoPage && !activeRoute ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}>
              <div className="w-full flex flex-col items-center p-4 sm:p-6 md:p-8">
                <div className={`fixed inset-x-0 bottom-0 z-0 transition-opacity duration-700 ${isInitialLoad ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <div className="relative w-full max-w-md mx-auto translate-y-24">
                    <img src="https://pub-36abfb48eca14eb8b366a0211191ef0e.r2.dev/legacy/CafeI-theater-festival-2026-met-blauwe-verfklodderpng-scaled.png" alt="Afbeelding van campagnebeeld Café Theater Festival" className="w-full h-auto pointer-events-none" />
                  </div>

                  <img
                      src={landingFigures[0]}
                      className="hidden md:block absolute left-12 bottom-0 h-[30vh] w-auto object-contain pointer-events-none drop-shadow-2xl transition-transform duration-1000 ease-out translate-y-10"
                      alt="Decoratief figuur links"
                  />
                  <img
                      src={landingFigures[1]}
                      className="hidden md:block absolute right-12 bottom-0 h-[35vh] w-auto object-contain pointer-events-none drop-shadow-2xl transition-transform duration-1000 ease-out translate-y-10"
                      alt="Decoratief figuur rechts"
                  />
                </div>
                <div className="relative z-10 w-full">
                  <div className="absolute top-4 left-4 sm:top-12 flex flex-col space-y-2 items-start sm:flex-row sm:space-y-0 sm:space-x-2 sm:items-center">
                      <button
                        onClick={() => openContentPopup('iframe', 'https://stamgast.cafetheaterfestival.nl/')}
                        className="px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold bg-[#78b5e3]/90 text-black hover:bg-[#9f4493]/90 transition-colors duration-200 text-sm sm:text-base"
                        tabIndex="0"
                      >
                        <span className="sm:hidden">{translations[language].common.becomeRegularGuestShort}</span>
                        <span className="hidden sm:inline">{translations[language].common.becomeStamgastButton}</span>
                      </button>
                  </div>
                  <TopRightControls
                    language={language}
                    handleLanguageChange={handleLanguageChange}
                    translations={translations}
                  />

                  <AppHeader translations={translations} language={language} titleRef={titleRef} />
                  {!loading && (
                    <div>
                      <EventNavigation
                          onEventSelect={(e) => handleViewChange('timetable', e)}
                          onFavoritesSelect={() => handleViewChange('favorites')}
                          onFriendsFavoritesSelect={() => handleViewChange('friends-favorites')}
                          onMoreInfoSelect={() => handleViewChange('more-info')}
                          onAccessibilitySelect={() => handleViewChange('accessibility')}

                          onHelpChoosingSelect={() => {
                                const eventsWithRoutes = uniqueEvents.filter(evt => routesData.some(r => r.event === evt));

                                openContentPopup('helpChoosingEventSelection', {
                                    events: eventsWithRoutes,
                                    onSelectEvent: (chosenEvent) => {
                                        const eventRoutes = routesData.filter(r => r.event === chosenEvent);

                                        const allDates = new Set();
                                        eventRoutes.forEach(r => {
                                            if (r.dates && Array.isArray(r.dates)) {
                                                r.dates.forEach(d => allDates.add(d));
                                            }
                                        });
                                        const uniqueDates = Array.from(allDates).sort((a, b) => parseDateForSorting(a) - parseDateForSorting(b));

                                        const openRouteList = (filteredRoutes) => {
                                            openContentPopup('routeSelection', {
                                                routes: filteredRoutes,
                                                onSelectRoute: (route) => {
                                                    closePopup();
                                                    handleAnimatedUpdate(() => {
                                                        setSelectedEvent(chosenEvent);
                                                        setActiveRoute(route);
                                                        setIsInitialLoad(false);
                                                        setShowStickyHeader(true);
                                                        window.scrollTo({ top: 0, behavior: 'auto' });
                                                    });
                                                }
                                            });
                                        };

                                        if (uniqueDates.length > 0) {
                                            openContentPopup('routeDateSelection', {
                                                dates: uniqueDates,
                                                onSelectDate: (selectedDate) => {
                                                    const routesForDate = eventRoutes.filter(r => r.dates && r.dates.includes(selectedDate));
                                                    openRouteList(routesForDate);
                                                }
                                            });
                                        } else {
                                            openRouteList(eventRoutes);
                                        }
                                    }
                                });
                          }}

                          hasFriendsFavorites={friendsFavorites.size > 0}
                          uniqueEvents={uniqueEvents}
                          language={language}
                          translations={translations}
                          eventInfoMap={eventInfoMap}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={`absolute inset-0 transition-all duration-500 ease-in-out ${isInitialLoad && !activePerformance && !activeInfoPage && !activeRoute ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
               <div id="main-content-area" className={`w-full h-full overflow-y-auto p-4 sm:p-6 md:p-8 ${showStickyHeader || activePerformance || activeInfoPage || activeRoute ? 'pt-24 sm:pt-20' : ''}`}>
                {renderMainContent()}
              </div>
            </div>
          </div>

          <div ref={newsSectionRef}>
             <NewsPage
                newsItems={newsData}
                openContentPopup={openContentPopup}
                language={language}
                translations={translations}
             />
          </div>

          <AppFooter logos={benefactorLogos} language={language} translations={translations} setShowPrivacyPolicy={setShowPrivacyPolicy} />
      </div>
      <PopupModal
        showPopup={showPopup}
        closePopup={closePopup}
        popupContent={popupContent}
        language={language}
        translations={translations}
        allPerformances={timetableData}
        openContentPopup={openContentPopup}
        onReservationClick={openReservationModal}
      />
      <PrivacyPolicyModal showPrivacyPolicy={showPrivacyPolicy} setShowPrivacyPolicy={setShowPrivacyPolicy} language={language} translations={translations} />
      <CustomTooltip showCustomTooltip={showCustomTooltip} customTooltipContent={customTooltipContent} customTooltipPosition={customTooltipPosition} />
      <ReservationModal
        show={showReservationModal}
        onClose={() => setShowReservationModal(false)}
        performance={reservationPerformance}
        language={language}
        translations={translations}
        onSuccess={handleReservationSuccess}
    />
      <MessageBox show={messageBoxConfig.show} title={messageBoxConfig.title} message={messageBoxConfig.message} buttons={messageBoxConfig.buttons} />
      <Toaster position="bottom-center" richColors closeButton />
      <ExportModal
        show={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        language={language}
        translations={translations[language]}
        isExporting={isExporting}
        showImageExportOption={favoritesViewMode === 'block'}
      />
      <ImportFavoritesModal
        show={showImportPopup}
        onClose={() => setShowImportPopup(false)}
        onImport={handleImportFavorites}
        performances={sharedFavoritesForImport}
        language={language}
        translations={translations[language]}
      />

      {!isInitialLoad && !activePerformance && !activeInfoPage && currentView !== 'opencall' && (
        <SearchFilterNudges
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            genreFilters={genreFilters}
            setGenreFilters={setGenreFilters}
            allGenres={allGenres}
            iconFilters={iconFilters}
            setIconFilters={setIconFilters}
            filterScope={filterScope}
            setFilterScope={setFilterScope}
            safetyIcons={safetyIcons}
            language={language}
            translations={translations}
        />
      )}

      {cookieConsent === null && (
        <CookieConsentPopup
            onAcceptAll={() => handleCookieChoice('all')}
            onAcceptFunctional={() => handleCookieChoice('functional')}
            onDecline={() => handleCookieChoice('declined')}
            language={language}
            translations={translations}
        />
      )}

      <AppDownloadPopup
        show={showAppDownloadPopup}
        onClose={handleCloseAppDownloadPopup}
        language={language}
        translations={translations}
      />

      {exportConfig && (
          <div style={{ position: 'absolute', left: '-9999px', top: 0, backgroundColor: '#20747f', padding: '20px' }}>
              {exportConfig.type === 'card' ? (
                  <TimetableDisplay
                      ref={exportCardViewRef}
                      isExportMode={true}
                      displayedData={favoritesDataForExport}
                      currentView="favorites"
                      favorites={favorites}
                      language={language}
                      translations={translations}
                      safetyIcons={safetyIcons}
                      toggleFavorite={() => {}}
                      addToGoogleCalendar={() => {}}
                      openContentPopup={() => {}}
                      handleIconMouseEnter={() => {}}
                      handleIconMouseLeave={() => {}}
                      showMessageBox={() => {}}
                      onNavigate={() => {}}
                      onReservationClick={() => {}}
                  />
              ) : (
                  <BlockTimetable
                      ref={exportBlockViewRef}
                      isExportMode={true}
                      allData={timetableData}
                      favorites={favorites}
                      isFavoritesView={true}
                      isFriendsView={false}
                      friendsFavorites={friendsFavorites}
                      language={language}
                      translations={translations}
                      toggleFavorite={() => {}}
                      openContentPopup={() => {}}
                  />
              )}
          </div>
      )}
    </div>
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);

export default App;
