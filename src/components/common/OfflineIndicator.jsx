import React from 'react';

const OfflineIndicator = ({ isOffline, language, translations, onRetry }) => {
  if (!isOffline) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-black text-center p-4 pb-6 z-50 text-sm font-semibold shadow-lg flex items-center justify-center gap-4">
      <span>{translations[language].common.offlineIndicator}</span>
      <button onClick={onRetry} className="bg-black/20 text-white font-bold py-1 px-3 rounded-md hover:bg-black/40 transition-colors">
        {translations[language].common.tryAgain}
      </button>
    </div>
  );
};

export default OfflineIndicator;
