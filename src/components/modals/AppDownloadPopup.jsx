import React from 'react';

const AppDownloadPopup = ({ show, onClose, language, translations }) => {
    const t = translations[language].appDownload;
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[100]">
            <div role="dialog" aria-modal="true" aria-labelledby="download-popup-title" className="bg-[#20747f] text-white rounded-lg p-6 shadow-xl max-w-md w-full text-center relative animate-fade-in">
                <button onClick={onClose} className="absolute top-2 right-2 text-white hover:text-gray-200 text-3xl font-bold z-10" aria-label={translations[language].common.close}>&times;</button>
                <h1 id="download-popup-title" className="text-2xl font-bold mb-4">{t.popupTitle}</h1>
                <div className="flex justify-center items-center space-x-4 my-6">
                    <a href="https://play.google.com/store/apps/details?id=nl.cafetheaterfestival.ctftimetable&pli=1" target="_blank" rel="noopener noreferrer">
                        <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt={t.playStoreAlt} className="h-16" />
                    </a>
                    <a href="https://apps.apple.com/app/ctf-timetable/id6752912026" target="_blank" rel="noopener noreferrer">
                        <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt={t.appStoreAlt} className="h-16" />
                    </a>
                </div>
            </div>
        </div>
    );
};

export default AppDownloadPopup;
