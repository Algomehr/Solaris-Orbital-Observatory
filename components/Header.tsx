import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const StatusIndicator: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <div className="flex items-center space-x-2">
    <div className={`w-2 h-2 rounded-full ${color} animate-pulse`}></div>
    <span className="text-xs uppercase tracking-widest">{label}</span>
  </div>
);

export const Header: React.FC = () => {
  const [utcTime, setUtcTime] = useState(new Date().toUTCString().slice(17, 25));
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'fa' : 'en');
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(new Date().toUTCString().slice(17, 25));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="flex flex-col md:flex-row justify-between items-center p-4 bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg shadow-lg shadow-cyan-500/10">
      <h1 className="font-orbitron text-2xl lg:text-3xl text-cyan-300 tracking-widest text-center md:text-left">
        {t('header_title')}
      </h1>
      <div className="flex items-center space-x-4 rtl:space-x-reverse md:space-x-6 rtl:md:space-x-reverse mt-4 md:mt-0 text-cyan-400">
        <StatusIndicator label={t('header_dsnLink')} color="bg-green-500" />
        <StatusIndicator label={t('header_system')} color="bg-green-500" />
        <div className="text-sm font-bold tracking-widest">UTC {utcTime}</div>
        <button 
          onClick={toggleLanguage} 
          className="font-orbitron text-sm px-3 py-1 border border-cyan-500/50 rounded-md hover:bg-cyan-500/20 transition-colors"
          aria-label="Toggle language"
        >
          {language === 'en' ? 'FA' : 'EN'}
        </button>
      </div>
    </header>
  );
};
