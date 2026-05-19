import React from 'react';

const AccessibilityPage = ({ accessibilityInfoItems, openContentPopup, language, translations }) => {
  const handleItemClick = (item) => {
    const itemText = item.tekst?.[language] || item.tekst?.nl;
    const itemTitle = item.title[language] || item.title.nl;
    if (item.weergave && itemText) {
      openContentPopup('customText', { text: itemText, imageUrl: item.imageUrl, title: itemTitle });
    } else {
      const itemUrl = item.url?.[language] || item.url?.nl;
      openContentPopup('iframe', itemUrl);
    }
  };

  const handleKeyDown = (e, item) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleItemClick(item); }
  };

  if (!accessibilityInfoItems || accessibilityInfoItems.length === 0) {
    return (
      <div className="text-center text-white p-4 bg-white bg-opacity-20 rounded-xl shadow-lg">
        Geen toegankelijkheidsinformatie beschikbaar.
      </div>
    );
  }

  return (
      <div className="w-full max-w-6xl mx-auto pt-20">
          <h2 className="text-3xl font-bold text-white mb-8 text-center drop_shadow-lg">{translations[language].common.accessibility}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
              {accessibilityInfoItems.map((item, index) => {
                  const itemTitle = item.title[language] || item.title.nl;
                  return (
                      <div key={index} className="bg-white rounded-xl shadow-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl w-full md:w-[384px]" onClick={() => handleItemClick(item)} onKeyDown={(e) => handleKeyDown(e, item)} tabIndex="0" role="button">
                          <img src={item.imageUrl} alt={`Afbeelding van ${itemTitle}`} className="w-full h-48 object-cover" loading="lazy" onError={(e) => { e.target.src = 'https://placehold.co/600x400/20747f/FFFFFF?text=Afbeelding+niet+gevonden'; }} />
                          <div className="p-4"><h2 className="text-lg font-semibold text-gray-800">{itemTitle}</h2></div>
                      </div>
                  );
              })}
          </div>
      </div>
  );
};

export default AccessibilityPage;
