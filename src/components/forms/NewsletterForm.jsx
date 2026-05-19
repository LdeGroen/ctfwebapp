import React, { useRef, useEffect } from 'react';

const NewsletterForm = ({ language }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (containerRef.current && containerRef.current.querySelector('script')) return;

        const script = document.createElement('script');
        script.src = "https://eocampaign1.com/form/3a755ba2-da27-11ef-bbaf-4f7a9e336f89.js";
        script.async = true;
        script.setAttribute('data-form', '3a755ba2-da27-11ef-bbaf-4f7a9e336f89');

        if (containerRef.current) {
            containerRef.current.appendChild(script);
        }

        const container = containerRef.current;
        return () => {
            if (container) {
                container.innerHTML = '';
            }
        };
    }, []);

    return (
        <div className="w-full text-left px-0 md:px-4">
            <h1 className="font-bold text-lg mb-2 text-[#78b5e3]">
                {language === 'nl' ? 'Blijf op de hoogte' : 'Stay updated'}
            </h1>
            <p className="text-sm text-gray-300 mb-4">
                {language === 'nl'
                    ? 'Schrijf je in voor de nieuwsbrief en mis niets van het festival.'
                    : 'Subscribe to our newsletter and don\'t miss a thing.'}
            </p>
            <div ref={containerRef} className="min-h-[120px] w-full bg-white bg-opacity-5 rounded-lg p-2"></div>
        </div>
    );
};

export default NewsletterForm;
