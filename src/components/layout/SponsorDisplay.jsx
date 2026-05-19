import React from 'react';

const SponsorDisplay = React.forwardRef(({ sponsorInfo, language, translations }, ref) => {
    if (!sponsorInfo || !sponsorInfo.logoUrl) return <div ref={ref} className="h-12"></div>;

    return (
        <div ref={ref} className="flex flex-col items-center justify-center mt-12 mb-8 text-center">
            <img src={sponsorInfo.logoUrl} alt={`Afbeelding van Logo ${sponsorInfo.eventName}`} className="max-h-20 w-auto object-contain mb-2"/>
            <p className="text-white text-lg font-semibold">{translations[language].common.proudMainSponsor.replace('%s', sponsorInfo.eventName)}</p>
        </div>
    );
});

export default SponsorDisplay;
