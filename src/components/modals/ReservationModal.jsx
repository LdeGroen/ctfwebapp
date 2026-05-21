import React, { useState, useEffect, useRef } from 'react';
import { Client, Databases, ID, APPWRITE_CONFIG } from '../../config/appwrite';


const applyFormattingLocal = (text) => {
    return text
        .replace(/\[b\](.*?)\[b\]/g, '<strong>$1</strong>')
        .replace(/\[i\](.*?)\[i\]/g, '<em>$1</em>')
        .replace(/\[u\](.*?)\[u\]/g, '<u>$1</u>');
};

// ========= NIEUW: Reservering Modal Component =========
const ReservationModal = ({ show, onClose, performance, language, translations }) => {
    const modalRef = useRef(null);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', amount: 1 });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);

    useEffect(() => {
        if (show) {
            setSubmitStatus(null);
            setFormData({ name: '', email: '', phone: '', amount: 1 });
            const focusableElements = modalRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const firstElement = focusableElements?.[0];
            const lastElement = focusableElements?.[focusableElements.length - 1];
            const previousActiveElement = document.activeElement;

            modalRef.current?.focus();

            const handleKeyDown = (event) => {
                if (event.key === 'Escape') { onClose(); return; }
                if (event.key === 'Tab' && firstElement && lastElement) {
                    if (event.shiftKey) {
                        if (document.activeElement === firstElement) { lastElement.focus(); event.preventDefault(); }
                    } else {
                        if (document.activeElement === lastElement) { firstElement.focus(); event.preventDefault(); }
                    }
                }
            };

            const currentModal = modalRef.current;
            currentModal?.addEventListener('keydown', handleKeyDown);

            return () => {
                currentModal?.removeEventListener('keydown', handleKeyDown);
                previousActiveElement?.focus();
            };
        }
    }, [show, onClose]);

    if (!show || !performance) return null;

    const title = performance.artist ? `${performance.artist} - ${performance.title}` : performance.title;
    const resText = language === 'nl' ? performance.resTextNL : performance.resTextENG;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus(null);
        try {
            const client = new Client().setEndpoint(APPWRITE_CONFIG.endpoint).setProject(APPWRITE_CONFIG.projectId);
            const databases = new Databases(client);
            await databases.createDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.reserveringen,
                ID.unique(),
                {
                    Naam: formData.name,
                    Aantal: parseInt(formData.amount, 10),
                    email: formData.email,
                    telefoonnummer: formData.phone,
                    executionID: performance.id
                }
            );
            setSubmitStatus('success');
        } catch (err) {
            console.error("Fout bij reserveren:", err);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[90]">
            <div ref={modalRef} tabIndex="-1" role="dialog" aria-modal="true" className="bg-white text-gray-800 p-6 md:p-8 rounded-xl shadow-2xl relative w-[95vw] h-[90vh] max-w-2xl flex flex-col">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 text-3xl font-bold z-10" aria-label={translations[language].common.close}>&times;</button>
                <div className="overflow-y-auto flex-grow">
                    <h2 className="text-2xl font-bold mb-4 text-[#20747f]">{translations[language].common.reservationTitle.replace('%s', title)}</h2>

                    {resText && (
                        <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: applyFormattingLocal(resText).replace(/\n/g, '<br />') }} />
                )}

                    {submitStatus === 'success' ? (
                        <div className="bg-green-100 text-green-800 p-4 rounded-lg font-semibold text-center mt-4">
                            {translations[language].common.reservationSuccess}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1 text-gray-700">{translations[language].common.reservationName} *</label>
                                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#20747f] outline-none" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-gray-700">{translations[language].common.reservationEmail} *</label>
                                    <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#20747f] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-1 text-gray-700">{translations[language].common.reservationPhone} *</label>
                                    <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#20747f] outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1 text-gray-700">
                                    {translations[language].common.reservationAmount} * {performance.resAvailableCapacity > 0 && <span className="ml-2 font-normal text-gray-500">({translations[language].common.reservationCapacity.replace('%s', performance.resAvailableCapacity)})</span>}
                                </label>
                                <input type="number" min="1" max={performance.resAvailableCapacity > 0 ? performance.resAvailableCapacity : undefined} required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#20747f] outline-none" />
                            </div>

                            {submitStatus === 'error' && (
                                <p className="text-red-500 text-sm font-medium mt-2">{translations[language].common.reservationError}</p>
                            )}

                            <button type="submit" disabled={isSubmitting} className="w-full py-3 mt-4 bg-[#20747f] text-white rounded-lg font-bold hover:bg-[#1a5b64] transition-colors disabled:bg-gray-400">
                                {isSubmitting ? '...' : translations[language].common.reservationSubmit}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReservationModal;
