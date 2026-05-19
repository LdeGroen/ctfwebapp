import React from 'react';

const NewsPage = ({ newsItems, openContentPopup, language, translations }) => {
  if (!newsItems || newsItems.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-full mx-auto py-16">
      <h1 className="text-3xl font-bold text-white mb-8 text-center drop_shadow-lg px-4">{translations[language].common.news}</h1>
      <div className="flex overflow-x-auto gap-6 pb-4 scrollbar-hide pl-4 pr-4 md:pl-8 lg:pl-16">
        {newsItems.map((item, index) => {
          const itemTitle = item.title[language] || item.title.nl;
          const isAd = item.isAdvertisement;

          const handleClick = () => {
            const itemText = item.tekst?.[language] || item.tekst?.nl;
            if (item.weergave && itemText) {
                openContentPopup('customText', { text: itemText, imageUrl: item.imageUrl, title: itemTitle, layout: 'side-by-side' });
            } else {
                const itemUrl = item.url?.[language] || item.url?.nl;
                openContentPopup('iframe', itemUrl);
            }
          };

          return (
            <div key={index} className="bg-white rounded-xl shadow-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl flex-shrink-0 w-[340px]" onClick={handleClick} tabIndex="0" role="button" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}>
              {isAd && (
                <div className="bg-[#2e9aaa] text-white text-xs font-bold uppercase tracking-wider text-center py-1 px-2">
                    {translations[language].common.advertisement}
                </div>
              )}
              <img src={item.imageUrl} alt={`Afbeelding van ${itemTitle}`} className="w-full h-48 object-cover" loading="lazy" onError={(e) => { e.target.src = 'https://placehold.co/600x400/20747f/FFFFFF?text=Afbeelding+niet+gevonden'; }} />
              <div className="p-4">
                <h2 className="text-lg font-semibold text-gray-800">{itemTitle}</h2>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NewsPage;
