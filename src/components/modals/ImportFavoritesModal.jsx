import React, { useRef, useEffect } from 'react';

const ImportFavoritesModal = ({ show, onClose, onImport, performances, language, translations }) => {
    const modalRef = useRef(null);
    useEffect(() => {
        if (show) {
            const focusableElements = modalRef.current?.querySelectorAll('button');
            const firstElement = focusableElements?.[0];
            const lastElement = focusableElements?.[focusableElements.length - 1];
            const previousActiveElement = document.activeElement;
            firstElement?.focus();
            const handleKeyDown = (event) => {
                if (event.key === 'Escape') { onClose(); return; }
                if (event.key === 'Tab' && firstElement && lastElement) {
                    if (event.shiftKey) { if (document.activeElement === firstElement) { lastElement.focus(); event.preventDefault(); } }
                    else { if (document.activeElement === lastElement) { firstElement.focus(); event.preventDefault(); } }
                }
            };
            const currentModal = modalRef.current;
            currentModal?.addEventListener('keydown', handleKeyDown);
            return () => { currentModal?.removeEventListener('keydown', handleKeyDown); previousActiveElement?.focus(); };
        }
    }, [show, onClose]);

    if (!show || !performances || performances.length === 0) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
            <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="import-title" className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full text-gray-800 flex flex-col max-h-[80vh]">
                <h2 id="import-title" className="text-xl font-bold text-center mb-4">{translations.common.favoritesFromFriend}</h2>
                <div className="overflow-y-auto flex-grow mb-6 border-t border-b py-4">
                    <ul className="space-y-2">
                        {performances.map(item => (
                            <li key={item.id} className="p-2 bg-gray-100 rounded-md">
                                <p className="font-semibold text-[#20747f]">{item.artist ? `${item.artist} - ${item.title}` : item.title}</p>
                                <p className="text-sm text-gray-600">{item.date} - {item.time} @ {item.location}</p>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="flex justify-around gap-4">
                    <button onClick={onClose} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-lg transition duration-300">
                        {translations.common.cancel}
                    </button>
                    <button onClick={onImport} className="w-full bg-[#78b5e3] hover:bg-[#9f4493] text-black font-bold py-3 px-4 rounded-lg transition duration-300">
                        {translations.common.import}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportFavoritesModal;
