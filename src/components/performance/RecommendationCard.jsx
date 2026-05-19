import React from 'react';

// ========= NIEUW: Aanbevelingskaartje (versimpelde versie) =========
const RecommendationCard = ({ item, subtitle, onClick, language, translations }) => {
    if (!item) return null;

    const fullTitle = item.artist ? `${item.artist} - ${item.title}` : item.title;

    const translatedGenre = (() => {
        const genres = (item.genre && item.genre !== 'N/A') ? item.genre.split(',').map(g => g.trim()) : [];
        const subgenres = Array.isArray(item.subgenre) ? item.subgenre : [];
        const allTags = [...genres, ...subgenres];
        if (allTags.length === 0) return null;
        const translated = allTags.map(g => translations[language]?.genres?.[g] || g);
        return translated.join(' / ');
    })();

    return (
        <div
            onClick={onClick}
            className="bg-white text-gray-800 rounded-xl shadow-lg overflow-hidden flex flex-col cursor-pointer transition-transform hover:scale-105 hover:shadow-xl h-full w-full max-w-[280px]"
        >
             <div className="bg-[#20747f] text-white text-xs font-bold py-1 px-3 text-center uppercase tracking-wide">
                 {subtitle}
             </div>

             {/* Genre Badge */}
             {translatedGenre && (
                <div className="bg-[#2e9aaa] text-white text-xs font-bold uppercase tracking-wider text-center py-1 px-2">
                    {translatedGenre}
                </div>
            )}

            {/* Afbeelding */}
            {item.artistImageUrl && (
                <div className="w-full h-32 overflow-hidden bg-gray-200">
                    <img
                        src={item.artistImageUrl}
                        alt={`Afbeelding van ${item.artist}`}
                        className="w-full h-full object-cover object-top"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                </div>
            )}

            <div className="p-3 flex flex-col flex-grow justify-center text-center">
                 <h3 className="text-sm font-bold text-[#20747f] line-clamp-2 leading-tight">
                     {fullTitle}
                 </h3>
            </div>
        </div>
    );
};

export default RecommendationCard;
