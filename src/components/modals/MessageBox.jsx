import React, { useRef, useEffect } from 'react';

const MessageBox = ({ show, title, message, buttons }) => {
  const modalRef = useRef(null);
  useEffect(() => {
    if (show) {
      const focusableElements = modalRef.current?.querySelectorAll('button');
      const firstElement = focusableElements?.[0];
      const lastElement = focusableElements?.[focusableElements.length - 1];
      const previousActiveElement = document.activeElement;
      firstElement?.focus();
      const handleKeyDown = (event) => {
        if (event.key === 'Escape' && buttons.some(b => b.text.toLowerCase() === 'ok' || b.text.toLowerCase() === 'later' || b.text.toLowerCase() === 'annuleren' || b.text.toLowerCase() === 'sluit pop-up')) {
            const defaultAction = buttons.find(b => b.text.toLowerCase() === 'ok' || b.text.toLowerCase() === 'later' || b.text.toLowerCase() === 'annuleren' || b.text.toLowerCase() === 'sluit pop-up');
            if (defaultAction) { defaultAction.onClick(); }
            return;
        }
        if (event.key === 'Tab' && firstElement && lastElement) {
          if (event.shiftKey) { if (document.activeElement === firstElement) { lastElement.focus(); event.preventDefault(); } }
          else { if (document.activeElement === lastElement) { firstElement.focus(); event.preventDefault(); } }
        }
      };
      const currentModal = modalRef.current;
      currentModal?.addEventListener('keydown', handleKeyDown);
      return () => { currentModal?.removeEventListener('keydown', handleKeyDown); previousActiveElement?.focus(); };
    }
  }, [show, buttons]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
      <div ref={modalRef} role="alertdialog" aria-modal="true" aria-labelledby="messagebox-title" aria-describedby="messagebox-message" className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full text-center">
        {title && <h3 id="messagebox-title" className="text-xl font-bold text-gray-800 mb-2">{title}</h3>}
        <div id="messagebox-message" className="text-lg font-medium text-gray-800 mb-6">{message}</div>
        <div className="flex flex-col sm:flex-row-reverse justify-center space-y-2 sm:space-y-0 sm:space-x-reverse sm:space-x-3">
          {buttons.map((button, index) => (
            <button key={index} onClick={button.onClick} className={`font-bold py-2 px-4 rounded-lg transition duration-300 w-full sm:w-auto ${button.className || 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>
              {button.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MessageBox;
