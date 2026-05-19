import React from 'react';
import { CustomTextRenderer } from '../../utils/textRenderers';

const InfoDetailPage = ({ item, language, translations }) => {
    const itemTitle = item.title[language] || item.title.nl;
    const itemText = item.tekst?.[language] || item.tekst?.nl;
    const itemUrl = item.url?.[language] || item.url?.nl;

    return (
        <div className="px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 pt-32 sm:pt-28 text-white min-h-screen">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 text-center">{itemTitle}</h2>
            <div className="max-w-4xl mx-auto bg-black bg-opacity-30 p-6 rounded-lg">
                {item.weergave && itemText ? (
                     <CustomTextRenderer
                        text={itemText}
                        imageUrl={item.imageUrl}
                        title={itemTitle}
                        textColorClass="text-gray-200"
                    />
                ) : (
                    <iframe
                        src={itemUrl}
                        title={itemTitle}
                        className="w-full h-[80vh] border-0 rounded-lg"
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                    />
                )}
            </div>
        </div>
    );
};

export default InfoDetailPage;
