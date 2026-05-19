import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import NewsletterForm from '../forms/NewsletterForm';

const AppFooter = ({ logos, language, translations, setShowPrivacyPolicy }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const containerRef = useRef(null);
    const intervalRef = useRef(null);
    const interactionTimeoutRef = useRef(null);

    const [isInteracting, setIsInteracting] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragStartTranslate, setDragStartTranslate] = useState(0);
    const [currentTranslate, setCurrentTranslate] = useState(0);

    const extendedLogos = useMemo(() => {
        if (!logos || logos.length < 6) return logos || [];
        return [...logos, ...logos, ...logos];
    }, [logos]);

    const getItemWidth = useCallback(() => {
        if (containerRef.current && containerRef.current.children[0]) {
            const logoItem = containerRef.current.children[0];
            const styles = window.getComputedStyle(logoItem);
            return logoItem.offsetWidth + parseFloat(styles.marginLeft) + parseFloat(styles.marginRight);
        }
        return 256;
    }, []);

    const resetAutoScroll = useCallback(() => {
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            setCurrentIndex(prev => prev + 1);
        }, 4000);
    }, []);

    useEffect(() => {
        if (isInteracting || !logos || logos.length < 6) return;

        const itemWidth = getItemWidth();
        let targetTranslate = -currentIndex * itemWidth;

        if (currentIndex >= logos.length * 2) {
            setTimeout(() => {
                const newIndex = currentIndex % logos.length;
                const jumpTranslate = -newIndex * itemWidth;
                if (containerRef.current) containerRef.current.style.transition = 'none';
                setCurrentTranslate(jumpTranslate);
                setCurrentIndex(newIndex);
                requestAnimationFrame(() => {
                    if (containerRef.current) containerRef.current.style.transition = 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
                });
            }, 1500);
        }

        setCurrentTranslate(targetTranslate);
        resetAutoScroll();

        return () => clearInterval(intervalRef.current);
    }, [currentIndex, isInteracting, logos, getItemWidth, resetAutoScroll]);

    const handleInteractionStart = (clientX) => {
        clearInterval(intervalRef.current);
        clearTimeout(interactionTimeoutRef.current);
        setIsInteracting(true);
        setDragStartX(clientX);
        setDragStartTranslate(currentTranslate);
        if (containerRef.current) containerRef.current.style.transition = 'none';
    };

    const handleInteractionMove = (clientX) => {
        if (!isInteracting) return;
        const dragDelta = clientX - dragStartX;
        setCurrentTranslate(dragStartTranslate + dragDelta);
    };

    const handleInteractionEnd = () => {
        if (!isInteracting) return;
        setIsInteracting(false);
        const itemWidth = getItemWidth();
        const newIndex = Math.round(-currentTranslate / itemWidth);
        const clampedIndex = Math.max(0, Math.min(newIndex, extendedLogos.length - 1));
        if (containerRef.current) { containerRef.current.style.transition = 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)'; }
        setCurrentIndex(clampedIndex);
        interactionTimeoutRef.current = setTimeout(resetAutoScroll, 5000);
    };

    return (
        <footer className="w-full bg-black bg-opacity-50 text-white text-center pt-12 mt-12 overflow-hidden">
            <div className="max-w-7xl mx-auto mb-12 px-4 grid grid-cols-1 md:grid-cols-3 items-start gap-8">
                <div className="text-left">
                    <h1 className="font-bold text-lg mb-2">{translations[language].appDownload.title}</h1>
                    <div className="flex items-center space-x-2">
                        <a href="https://play.google.com/store/apps/details?id=nl.cafetheaterfestival.ctftimetable&pli=1" target="_blank" rel="noopener noreferrer" className="inline-block">
                            <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt={translations[language].appDownload.playStoreAlt} className="h-12" />
                        </a>
                        <a href="https://apps.apple.com/app/ctf-timetable/id6752912026" target="_blank" rel="noopener noreferrer" className="inline-block">
                            <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt={translations[language].appDownload.appStoreAlt} className="h-12" />
                        </a>
                    </div>
                </div>

                <NewsletterForm language={language} />

                <div className="bg-[#78b5e3] p-6 rounded-lg shadow-lg text-black w-full h-full flex flex-col justify-between">
                    <p className="text-base text-left mb-4">{translations[language].common.footerIntroText}</p>
                    <div className="text-right">
                        <button onClick={() => setShowPrivacyPolicy(true)} className="px-4 py-2 rounded-lg font-semibold bg-white bg-opacity-50 text-black hover:bg-opacity-70 transition-colors duration-200 text-sm">
                            {translations[language].common.privacyPolicy}
                        </button>
                    </div>
                </div>
            </div>

            {logos && logos.length > 0 && (
                <>
                    <h1 className="text-lg font-semibold mb-4 px-4">{translations[language].common.footerText}</h1>
                    <div
                        className="relative h-24 flex items-center cursor-grab active:cursor-grabbing"
                        onMouseDown={(e) => { e.preventDefault(); handleInteractionStart(e.pageX); }}
                        onMouseMove={(e) => { e.preventDefault(); handleInteractionMove(e.pageX); }}
                        onMouseUp={handleInteractionEnd}
                        onMouseLeave={handleInteractionEnd}
                        onTouchStart={(e) => handleInteractionStart(e.touches[0].clientX)}
                        onTouchMove={(e) => handleInteractionMove(e.touches[0].clientX)}
                        onTouchEnd={handleInteractionEnd}
                    >
                        <div className="flex" ref={containerRef} style={{ transform: `translateX(${currentTranslate}px)`, transition: isInteracting ? 'none' : 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                            {extendedLogos.map((logo, index) => {
                                const Wrapper = logo.link ? 'a' : 'div';
                                return (
                                    <Wrapper key={index} href={logo.link || undefined} target="_blank" rel="noopener noreferrer" className="group relative flex-shrink-0 h-20 w-48 flex items-center justify-center mx-8" tabIndex={-1}>
                                        <img src={logo.url} alt={`Afbeelding van Begunstiger logo ${logo.name}`} className="max-h-16 w-auto object-contain transition-transform duration-300 ease-in-out group-hover:scale-125 group-hover:-translate-y-3" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
                                        <div className="absolute bottom-full mb-2 w-max px-3 py-1 bg-gray-800 bg-opacity-80 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out pointer-events-none z-20">{logo.name}</div>
                                    </Wrapper>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </footer>
    );
};

export default AppFooter;
