import React from 'react';
import { renderPrivacyPolicyContent } from '../../utils/textRenderers';

const AppPrivacyPolicyPage = ({ language, translations }) => {
    const policy = translations[language].appPrivacyPolicy;
    return (
        <div className="w-full max-w-4xl mx-auto pt-28 sm:pt-24 pb-12 px-4 sm:px-6 md:px-8 text-white">
            <div className="bg-black bg-opacity-30 p-8 rounded-lg shadow-lg">
                <h1 className="text-3xl font-bold mb-6 text-center">{policy.title}</h1>
                <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed">
                    {renderPrivacyPolicyContent(policy.content, 'text-gray-300')}
                </div>
            </div>
        </div>
    );
};

export default AppPrivacyPolicyPage;
