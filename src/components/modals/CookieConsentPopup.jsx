import React from 'react';

const CookieConsentPopup = ({ onAcceptAll, onAcceptFunctional, onDecline, language, translations }) => {
  const t = translations[language].cookiePopup;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-80 backdrop-blur-sm p-4 z-[100] text-white shadow-lg animate-fade-in">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <h2 className="font-bold text-lg mb-1">{t.title}</h2>
          <p className="text-sm text-gray-300">{t.text}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
          <button onClick={onAcceptAll} className="px-5 py-2 rounded-lg font-semibold bg-[#2e9aaa] hover:bg-[#20747f] transition-colors duration-200">{t.acceptAll}</button>
          <button onClick={onAcceptFunctional} className="px-5 py-2 rounded-lg font-semibold bg-white/20 hover:bg-white/30 transition-colors duration-200">{t.acceptFunctional}</button>
          <button onClick={onDecline} className="px-5 py-2 rounded-lg font-semibold bg-transparent hover:bg-white/10 transition-colors duration-200">{t.decline}</button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentPopup;
