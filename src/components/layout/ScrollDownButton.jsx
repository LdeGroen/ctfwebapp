import React from 'react';
import { ChevronDown } from 'lucide-react';

const ScrollDownButton = ({ onClick, translations, language }) => (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
        <button
            onClick={onClick}
            className="animate-bounce bg-black/30 p-2 w-20 h-20 ring-1 ring-white/30 backdrop-blur-md rounded-full text-white flex items-center justify-center shadow-lg"
            aria-label={translations[language].common.news}
        >
            <ChevronDown className="w-10 h-10" />
        </button>
    </div>
);

export default ScrollDownButton;
