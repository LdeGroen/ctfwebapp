import React, { useRef, useEffect } from 'react';
import { renderPrivacyPolicyContent } from '../../utils/textRenderers';

const PrivacyPolicyModal = ({ showPrivacyPolicy, setShowPrivacyPolicy, language, translations }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (showPrivacyPolicy) {
      const focusableElements = modalRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      const firstElement = focusableElements?.[0];
      const lastElement = focusableElements?.[focusableElements.length - 1];
      const previousActiveElement = document.activeElement;
      modalRef.current?.focus();
      const handleKeyDown = (event) => {
        if (event.key === 'Escape') { setShowPrivacyPolicy(false); return; }
        if (event.key === 'Tab' && firstElement && lastElement) {
          if (event.shiftKey) { if (document.activeElement === firstElement) { lastElement.focus(); event.preventDefault(); } }
          else { if (document.activeElement === lastElement) { firstElement.focus(); event.preventDefault(); } }
        }
      };
      const currentModal = modalRef.current;
      currentModal?.addEventListener('keydown', handleKeyDown);
      return () => { currentModal?.removeEventListener('keydown', handleKeyDown); previousActiveElement?.focus(); };
    }
  }, [showPrivacyPolicy, setShowPrivacyPolicy]);

  if (!showPrivacyPolicy) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[90]">
      <div ref={modalRef} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="messagebox-title" aria-describedby="messagebox-message" className="bg-white text-gray-800 p-8 rounded-xl shadow-2xl relative w-[95vw] h-[90vh] max-w-4xl flex flex-col">
        <button onClick={() => setShowPrivacyPolicy(false)} className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 text-3xl font-bold z-10" aria-label={translations[language].common.close}>&times;</button>
        <div className="overflow-y-auto flex-grow">
            <h2 className="text-2xl font-bold mb-4 text-[#20747f]">{translations[language].common.privacyPolicy}</h2>
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed" style={{ color: '#333' }}>
              {renderPrivacyPolicyContent(translations[language].privacyPolicyContent)}
            </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal;
