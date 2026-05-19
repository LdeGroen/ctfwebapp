import React, { useRef, useEffect } from 'react';

const ExportModal = ({ show, onClose, onExport, language, translations, isExporting, showImageExportOption }) => {
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

    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
            <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="export-title" className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full text-gray-800">
                <h3 id="export-title" className="text-xl font-bold text-center mb-6">{translations.common.exportFavoritesTitle}</h3>
                <div className="space-y-4">
                    {showImageExportOption && (
                        <button onClick={() => onExport('image')} disabled={isExporting} className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:bg-gray-400 flex items-center justify-center gap-2">
                            {isExporting ? translations.common.exporting : translations.common.shareAsImage}
                        </button>
                    )}
                    <button onClick={() => onExport('link')} disabled={isExporting} className="w-full bg-[#78b5e3] hover:bg-[#9f4493] text-black font-bold py-3 px-4 rounded-lg transition duration-300 disabled:bg-gray-400 flex items-center justify-center gap-2">
                        {isExporting ? "Bezig..." : translations.common.shareAsLink}
                    </button>
                </div>
                <button onClick={onClose} className="w-full mt-6 text-gray-600 hover:text-gray-800 font-semibold py-2">
                    {translations.common.close}
                </button>
            </div>
        </div>
    );
};

export default ExportModal;
