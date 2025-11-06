import React, { useState, useEffect, useRef } from 'react';
import { ThreeJS_Sun } from './ThreeJS_Sun';
import { generateSpeech, decode, decodeAudioData } from '../services/ttsService';
import { useLanguage } from '../contexts/LanguageContext';

const InfoPanel: React.FC<React.PropsWithChildren<{ title: string; icon: React.ReactNode }>> = ({ title, icon, children }) => (
  <div className="bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4 shadow-lg shadow-cyan-500/10">
    <h3 className="font-orbitron text-cyan-300 border-b-2 border-cyan-500/30 pb-1 mb-3 text-sm tracking-wider uppercase flex items-center">
      {icon}
      <span className="ml-2 rtl:mr-2 rtl:ml-0">{title}</span>
    </h3>
    <div className="text-sm font-mono text-cyan-400/90 leading-relaxed">
      {children}
    </div>
  </div>
);

export const SolarFlare3D: React.FC = () => {
  const { t } = useLanguage();
  const [isFlareActive, setIsFlareActive] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // TTS State
  const [isAudioGenerating, setIsAudioGenerating] = useState<boolean>(true);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    // Generate audio on component mount
    const initAudio = async () => {
      setIsAudioGenerating(true);
      try {
        const briefingText = t('flare3D_audioBriefingText');
        const base64Audio = await generateSpeech(briefingText);

        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const decodedBytes = decode(base64Audio);
        const buffer = await decodeAudioData(decodedBytes, audioContextRef.current, 24000, 1);
        setAudioBuffer(buffer);
      } catch (error) {
        console.error("Failed to generate audio briefing:", error);
      } finally {
        setIsAudioGenerating(false);
      }
    };

    initAudio();

    return () => {
      // Cleanup audio resources
      audioSourceRef.current?.stop();
      audioSourceRef.current = null;
      audioContextRef.current?.close();
    };
  }, [t]);

  const toggleAudioPlayback = () => {
    if (!audioBuffer || !audioContextRef.current) return;

    if (isAudioPlaying) {
      // Pause/Stop
      audioSourceRef.current?.stop();
      audioSourceRef.current = null;
      setIsAudioPlaying(false);
    } else {
      // Play
      // Ensure context is running (for autoplay policy)
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.loop = true; // Loop as requested
      source.start(0);
      audioSourceRef.current = source;
      setIsAudioPlaying(true);
    }
  };


  const triggerFlare = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setIsFlareActive(true);

    setTimeout(() => {
      setIsFlareActive(false);
    }, 500); // Start fade out of flare trigger
    
    setTimeout(() => {
      setIsAnimating(false);
    }, 4000); // Cooldown to match animation duration
  };

  return (
    <div className="w-full h-full flex flex-col p-4 gap-6 animate-fadeIn">
      <header className="text-center">
        <h2 className="font-orbitron text-2xl text-cyan-200 tracking-widest">
          {t('flare3D_title')}
        </h2>
        <p className="text-cyan-400/80">
          {t('flare3D_subtitle')}
        </p>
      </header>
      
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <InfoPanel 
            title={t('flare3D_controlsTitle')} 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>}
          >
            <p>{t('flare3D_controlsDesc')}</p>
            <button
              onClick={triggerFlare}
              disabled={isAnimating}
              className="w-full mt-4 py-3 font-orbitron text-lg rounded-md border-2 transition-all duration-300 bg-red-500/20 border-red-400 text-red-300 hover:bg-red-400 hover:text-gray-900 hover:shadow-lg hover:shadow-red-400/50 active:scale-95 disabled:bg-gray-600/30 disabled:border-gray-500 disabled:text-gray-500 disabled:cursor-wait"
            >
              {isAnimating ? t('flare3D_inProgress') : t('flare3D_initiateButton')}
            </button>
          </InfoPanel>
          <InfoPanel 
            title={t('flare3D_paramsTitle')} 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7.014A8.003 8.003 0 0117.657 18.657z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>}
          >
            <p><strong>{t('flare3D_paramsClass')}</strong> M-Class (Simulated)</p>
            <p><strong>{t('flare3D_paramsSource')}</strong> AR3745</p>
            <p><strong>{t('flare3D_paramsVelocity')}</strong> 850 km/s</p>
            <p><strong>{t('flare3D_paramsDensity')}</strong> High</p>
          </InfoPanel>
          <InfoPanel 
            title={t('flare3D_audioTitle')}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>}
          >
            <p>{t('flare3D_audioDesc')}</p>
            <button
              onClick={toggleAudioPlayback}
              disabled={isAudioGenerating}
              className="w-full mt-4 py-2 font-orbitron text-md rounded-md border-2 transition-all duration-300 bg-cyan-500/20 border-cyan-400 text-cyan-300 hover:bg-cyan-400 hover:text-gray-900 active:scale-95 disabled:bg-gray-600/30 disabled:border-gray-500 disabled:text-gray-500 disabled:cursor-wait flex items-center justify-center gap-2"
            >
              {isAudioGenerating ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>{t('flare3D_generating')}</span>
                </>
              ) : isAudioPlaying ? (
                t('flare3D_pauseBriefing')
              ) : (
                t('flare3D_playBriefing')
              )}
            </button>
          </InfoPanel>
        </div>

        {/* Center - 3D View */}
        <div className="lg:col-span-2 flex items-center justify-center min-h-[400px] lg:min-h-0 relative bg-black/30 rounded-lg border border-cyan-800/60 overflow-hidden">
          <ThreeJS_Sun isFlareActive={isFlareActive} />
        </div>

        {/* Right Panel - Analysis */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <InfoPanel 
            title={t('flare3D_trajectoryTitle')} 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>}
          >
             <p><strong>{t('flare3D_trajectoryVector')}</strong> Earth-directed</p>
             <p><strong>{t('flare3D_trajectoryArrival')}</strong> 48 hours</p>
             <p className="mt-2 text-cyan-300/80">{t('flare3D_trajectoryDesc')}</p>
          </InfoPanel>
          <InfoPanel 
            title={t('flare3D_impactTitle')}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
          >
             <ul className="space-y-1">
                <li><span className="text-green-400">{t('flare3D_impactAurora')}</span> High</li>
                <li><span className="text-yellow-400">{t('flare3D_impactRadio')}</span> Probable</li>
                <li><span className="text-yellow-400">{t('flare3D_impactSat')}</span> Risk</li>
                <li><span className="text-green-400">{t('flare3D_impactGrid')}</span> Minor risk</li>
             </ul>
          </InfoPanel>
        </div>
      </div>
    </div>
  );
};
