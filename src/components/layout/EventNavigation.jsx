import React from 'react';

// ========= WIJZIGING: EventNavigation aangepast voor 'Open Call' navigatie =========
const EventNavigation = ({ onEventSelect, onFavoritesSelect, onFriendsFavoritesSelect, onMoreInfoSelect, onAccessibilitySelect, onHelpChoosingSelect, hasFriendsFavorites, uniqueEvents, language, translations, eventInfoMap }) => {
    const baseDelay = 100; // Vertraging in ms per item voor de 'staggered' animatie
    const hasEvents = uniqueEvents && uniqueEvents.length > 0;

    const eventButtons = uniqueEvents.map((event, index) => {
        // AANGEPAST: Vervang 'tm' door 't/m' in de datumweergave
        const dates = eventInfoMap?.[event]?.displayDates?.replace(/ tm /gi, ' t/m ');

        // Bereken vertraging op basis van de positie
        const delay = index * baseDelay;

        return (
            <button
                key={event}
                onClick={() => onEventSelect(event)}
                className="animate-fade-in-up px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 bg-[#78b5e3] bg-opacity-80 text-black hover:bg-[#9f4493] flex flex-col items-center justify-center opacity-0" // opacity-0 start onzichtbaar
                style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }} // forwards zorgt dat hij zichtbaar blijft na animatie
            >
                <h1 className="text-lg font-semibold">{event}</h1>
                {dates && <span className="text-md font-normal mt-1 opacity-90 hidden md:block">{dates}</span>}
            </button>
        );
    });

    // Configuratie voor de overige knoppen om ze makkelijk te mappen met vertraging
    const utilityButtonsConfig = [
        hasEvents ? { onClick: onHelpChoosingSelect, label: translations[language].common.helpChoosing } : null,
        { onClick: onFavoritesSelect, label: translations[language].common.favorites },
        hasFriendsFavorites ? { onClick: onFriendsFavoritesSelect, label: translations[language].common.friendsFavorites } : null,
        { onClick: onMoreInfoSelect, label: translations[language].common.moreInfo },
        { onClick: onAccessibilitySelect, label: translations[language].common.accessibility }
    ].filter(Boolean);

    const utilityButtons = utilityButtonsConfig.map((btn, index) => {
        // De vertraging gaat verder waar de events ophielden
        const delay = (hasEvents ? uniqueEvents.length : 1) * baseDelay + (index * baseDelay);

        return (
            <button
                key={btn.label}
                onClick={btn.onClick}
                className="animate-fade-in-up px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 bg-[#78b5e3] bg-opacity-80 text-black hover:bg-[#9f4493] flex flex-col items-center justify-center opacity-0"
                style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
            >
                <h1 className="text-lg font-semibold">{btn.label}</h1>
            </button>
        );
    });

    return (
        <div className="flex flex-col items-center gap-4 mb-8 p-3 max-w-full">
            {hasEvents ? (
                <div className="flex flex-wrap justify-center gap-4">
                    {eventButtons}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-center mb-6 px-4 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
                    <p className="text-xl md:text-2xl font-bold text-white mb-6 drop-shadow-md max-w-2xl leading-relaxed">
                        {language === 'nl'
                            ? 'Het CTF 2026 zit er weer op! In maart zijn we er weer voor het CTF 2027.'
                            : 'CTF 2026 is a wrap! We will be back in March for CTF 2027.'}
                    </p>
                    <button
                        onClick={() => window.location.href = 'https://archief.cafetheaterfestival.nl'}
                        className="animate-fade-in-up px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 bg-[#78b5e3] bg-opacity-80 text-black hover:bg-[#9f4493] flex flex-col items-center justify-center shadow-lg opacity-0"
                        style={{ animationDelay: `${baseDelay}ms`, animationFillMode: 'forwards' }}
                    >
                        <h1 className="text-lg font-semibold">{language === 'nl' ? 'Archief' : 'Archive'}</h1>
                    </button>
                </div>
            )}
            <div className="flex flex-wrap justify-center gap-4">
                {utilityButtons}
            </div>
        </div>
    );
};

export default EventNavigation;
