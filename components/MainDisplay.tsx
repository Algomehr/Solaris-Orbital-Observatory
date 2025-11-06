import React, { useState, useEffect } from 'react';
import type { AiaWavelength, InstrumentSelection } from '../types';
import { HMI_IMAGE_URL } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface MainDisplayProps {
  wavelength: AiaWavelength;
  isProcessing: boolean;
  showHmi: boolean;
  selections: InstrumentSelection;
  displaySource: 'AIA' | 'HMI';
  setDisplaySource: (source: 'AIA' | 'HMI') => void;
}

const ViewToggleButton: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 text-xs font-orbitron rounded-md transition-colors duration-200 ${
      active
        ? 'bg-cyan-400 text-gray-900 shadow-md shadow-cyan-400/50'
        : 'bg-black/50 text-cyan-300 hover:bg-cyan-500/20'
    }`}
  >
    {label}
  </button>
);


export const MainDisplay: React.FC<MainDisplayProps> = ({ wavelength, isProcessing, showHmi, selections, displaySource, setDisplaySource }) => {
  const { t } = useLanguage();
  const [mediaUrlWithCacheBust, setMediaUrlWithCacheBust] = useState('');

  const baseUrl = showHmi ? HMI_IMAGE_URL : wavelength.videoUrl;
  const imageLabel = showHmi 
    ? t('mainDisplay_hmiLabel') 
    : t('mainDisplay_aiaLabel', { name: wavelength.name, temp: wavelength.temp });

  useEffect(() => {
    // Add a cache-busting query parameter to fetch the latest media from SDO
    if (baseUrl) {
      setMediaUrlWithCacheBust(`${baseUrl}?t=${new Date().getTime()}`);
    }
  }, [baseUrl]);

  return (
    <div className="w-full aspect-square max-w-2xl p-4 bg-black/50 border-2 border-cyan-700/50 rounded-full flex items-start justify-center relative shadow-2xl shadow-cyan-500/20">
      <div className="w-full aspect-square rounded-full overflow-hidden relative">
        {showHmi ? (
           <img
            key={mediaUrlWithCacheBust}
            src={mediaUrlWithCacheBust}
            alt={imageLabel}
            className={`w-full h-full object-cover rounded-full transition-all duration-500 ${isProcessing ? 'opacity-30 blur-sm' : 'opacity-90'}`}
          />
        ) : (
          <video
            key={mediaUrlWithCacheBust}
            src={mediaUrlWithCacheBust}
            autoPlay
            loop
            muted
            playsInline
            className={`w-full h-full object-cover rounded-full transition-all duration-500 ${isProcessing ? 'opacity-30 blur-sm' : 'opacity-90'}`}
          />
        )}
        <div 
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            boxShadow: `inset 0 0 80px 20px black, inset 0 0 15px 5px ${showHmi ? '#9ca3af' : wavelength.color}`
          }}
        ></div>
      </div>
      
      {isProcessing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center bg-black/30 rounded-full">
            <svg className="w-24 h-24 text-cyan-400 animate-spin" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="4" strokeOpacity="0.3"/>
                <path d="M50 5C25.1472 5 5 25.1472 5 50" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
            </svg>
            <p className="mt-4 font-orbitron text-lg tracking-widest text-cyan-300">{t('mainDisplay_acquiring')}</p>
        </div>
      )}
      
      {selections.AIA && selections.HMI && !isProcessing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-start gap-2 p-1 bg-black/70 border border-cyan-700/50 rounded-lg backdrop-blur-sm">
          <ViewToggleButton label={t('mainDisplay_toggleAIA')} active={displaySource === 'AIA'} onClick={() => setDisplaySource('AIA')} />
          <ViewToggleButton label={t('mainDisplay_toggleHMI')} active={displaySource === 'HMI'} onClick={() => setDisplaySource('HMI')} />
        </div>
      )}

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 bg-black/70 rounded-md border border-cyan-700/50 text-xs text-center">
        <p className="font-bold tracking-wider">{imageLabel}</p>
      </div>
    </div>
  );
};
