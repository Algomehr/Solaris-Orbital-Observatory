import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { translations } from '../translations';

type Language = 'en' | 'fa';

// Helper function for translations with placeholders
const translate = (lang: Language, key: string, replacements: { [key: string]: string | number } = {}): string => {
    const keys = key.split('.');
    let result = (translations[lang] as any);
    for (const k of keys) {
        result = result?.[k];
        if (result === undefined) {
            // Fallback to English if translation is missing
            let fallbackResult = (translations.en as any);
            for (const fk of keys) {
                fallbackResult = fallbackResult?.[fk];
                if (fallbackResult === undefined) return key; // Return key if not found anywhere
            }
            result = fallbackResult;
            break;
        }
    }

    if (typeof result !== 'string') return key;

    // Replace placeholders like {name}
    return Object.keys(replacements).reduce(
        (acc, currentKey) => acc.replace(`{${currentKey}}`, String(replacements[currentKey])),
        result
    );
};


interface LanguageContextType {
    language: Language;
    setLanguage: (language: Language) => void;
    t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>('en');

    useEffect(() => {
        if (language === 'fa') {
            document.documentElement.setAttribute('dir', 'rtl');
            document.documentElement.lang = 'fa';
        } else {
            document.documentElement.setAttribute('dir', 'ltr');
            document.documentElement.lang = 'en';
        }
    }, [language]);

    const value = {
        language,
        setLanguage,
        t: (key: string, replacements?: { [key: string]: string | number }) => translate(language, key, replacements),
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
