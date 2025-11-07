import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ThreeJS_Sun } from './ThreeJS_Sun';
import { generateSpeech, decode, decodeAudioData } from '../services/ttsService';
import { useLanguage } from '../contexts/LanguageContext';

type SourceRegion = { x: number; y: number; name: string };
type AnalysisData = {
  velocity: { value: number; unit: string };
  density: { value: number; unit: string };
  arrival: { value: number; unit: string };
  impacts: { name: string; level: 'Low' | 'Moderate' | 'High' | 'Severe'; color: string }[];
};

const ACTIVE_REGIONS: SourceRegion[] = [
    { x: 0.65, y: 0.65, name: 'AR3745' },
    { x: 0.40, y: 0.55, name: 'AR3748' },
    { x: 0.58, y: 0.38, name: 'AR3749' },
];

const AnalysisAudioPlayer: React.FC<{ analysisData: AnalysisData; language: 'en' | 'fa' }> = ({ analysisData, language }) => {
    const { t } = useLanguage();
    const [isAudioGenerating, setIsAudioGenerating] = useState(false);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
    const [error, setError] = useState('');
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    const stopPlayback = useCallback(() => {
        if (audioSourceRef.current) {
            audioSourceRef.current.onended = null;
            audioSourceRef.current.stop();
            audioSourceRef.current = null;
        }
        setIsAudioPlaying(false);
    }, []);

    const formatAnalysisForSpeech = useCallback(() => {
        const impactsText = analysisData.impacts
            .map(impact => `${impact.level} risk for ${impact.name}`)
            .join(', ');
            
        return t('flare3D_audioReport', {
            velocity: analysisData.velocity.value.toFixed(0),
            density: analysisData.density.value.toFixed(1),
            arrival: analysisData.arrival.value.toFixed(1),
            impacts: impactsText
        });
    }, [analysisData, t]);


    const generateAndPlay = useCallback(async () => {
        if (isAudioPlaying) {
            stopPlayback();
            return;
        }

        if (audioBuffer) {
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                 audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.onended = () => setIsAudioPlaying(false);
            source.start(0);
            audioSourceRef.current = source;
            setIsAudioPlaying(true);
            return;
        }

        setIsAudioGenerating(true);
        setError('');
        try {
            const textContent = formatAnalysisForSpeech();
            const base64Audio = await generateSpeech(textContent, language);
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const decodedBytes = decode(base64Audio);
            const buffer = await decodeAudioData(decodedBytes, audioContextRef.current, 24000, 1);
            setAudioBuffer(buffer);
            
            const source = audioContextRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContextRef.current.destination);
            source.onended = () => setIsAudioPlaying(false);
            source.start(0);
            audioSourceRef.current = source;
            setIsAudioPlaying(true);
        } catch (err) {
            console.error("Failed to generate audio:", err);
            setError(t('flare3D_audioFailed'));
        } finally {
            setIsAudioGenerating(false);
        }
    }, [isAudioPlaying, stopPlayback, audioBuffer, formatAnalysisForSpeech, language, t]);

    useEffect(() => {
        // Reset audio buffer if analysis data changes
        setAudioBuffer(null);
        stopPlayback();
    }, [analysisData, stopPlayback]);

    useEffect(() => {
        return () => {
            stopPlayback();
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
    }, [stopPlayback]);

    const Icon = () => {
        if (isAudioGenerating) return <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
        if (isAudioPlaying) return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>;
    };

    if (error) {
        return <span className="text-xs text-red-400" title={error}>{t('flare3D_audioFailed')}</span>
    }

    return (
        <button
            onClick={generateAndPlay}
            disabled={isAudioGenerating}
            aria-label={isAudioPlaying ? t('flare3D_audioStop') : t('flare3D_audioBriefing')}
            className="p-1.5 rounded-full text-cyan-400/70 transition-colors duration-200 hover:bg-cyan-500/20 hover:text-cyan-200 disabled:opacity-50 disabled:cursor-wait"
        >
            <Icon />
        </button>
    );
};


const InfoPanel: React.FC<React.PropsWithChildren<{ title: string; icon: React.ReactNode, className?: string, headerAction?: React.ReactNode }>> = ({ title, icon, className, headerAction, children }) => (
  <div className={`bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4 shadow-lg shadow-cyan-500/10 flex flex-col ${className}`}>
    <h3 className="font-orbitron text-cyan-300 border-b-2 border-cyan-500/30 pb-1 mb-3 text-sm tracking-wider uppercase flex items-center flex-shrink-0 justify-between">
      <div className="flex items-center">
        {icon}
        <span className="ml-2 rtl:mr-2 rtl:ml-0">{title}</span>
      </div>
      {headerAction}
    </h3>
    <div className="flex-grow">
      {children}
    </div>
  </div>
);

const AnalysisReadout: React.FC<{ data: AnalysisData | null }> = ({ data }) => {
    const { t } = useLanguage();
    if (!data) {
        return <p className="text-gray-500 italic text-center p-4">{t('flare3D_awaitingAnalysis')}</p>;
    }

    return (
        <div className="text-sm font-mono text-cyan-400/90 leading-relaxed space-y-3 animate-fadeIn">
            <div>
                <p className="text-cyan-300/80">{t('flare3D_paramsVelocity')}</p>
                <p className="text-xl font-orbitron text-cyan-200">{data.velocity.value.toFixed(0)} <span className="text-sm">{data.velocity.unit}</span></p>
            </div>
            <div>
                <p className="text-cyan-300/80">{t('flare3D_paramsDensity')}</p>
                <p className="text-xl font-orbitron text-cyan-200">{data.density.value.toFixed(1)} <span className="text-sm">{data.density.unit}</span></p>
            </div>
             <div>
                <p className="text-cyan-300/80">{t('flare3D_trajectoryArrival')}</p>
                <p className="text-xl font-orbitron text-cyan-200">{data.arrival.value.toFixed(1)} <span className="text-sm">{t('flare3D_hours')}</span></p>
            </div>
            <div className="pt-2">
                 <p className="text-cyan-300/80 mb-1">{t('flare3D_impactTitle')}</p>
                 <ul className="space-y-1">
                     {data.impacts.map(impact => (
                         <li key={impact.name} className="flex justify-between items-center">
                             <span>{impact.name}</span>
                             <span className={`font-bold ${impact.color}`}>{impact.level}</span>
                         </li>
                     ))}
                 </ul>
            </div>
        </div>
    );
};

export const SolarFlare3D: React.FC = () => {
  const { t, language } = useLanguage();
  const [isFlareActive, setIsFlareActive] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Simulation Parameters
  const [flareClass, setFlareClass] = useState('M');
  const [flareMagnitude, setFlareMagnitude] = useState(5);
  const [sourceRegion, setSourceRegion] = useState<SourceRegion>(ACTIVE_REGIONS[0]);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);

  const triggerFlare = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setIsFlareActive(true);
    setAnalysisData(null); // Clear previous analysis

    setTimeout(() => {
      setIsFlareActive(false);
    }, 500); // Start fade out of flare trigger
    
    // Simulate analysis delay and calculate results
    setTimeout(() => {
        const magFactor = flareMagnitude / 9; // 0..1
        const classFactor = flareClass === 'X' ? 2 : 1;
        
        const velocity = 600 + (1400 * magFactor * classFactor);
        const density = 5 + (50 * magFactor * classFactor);
        const arrival = 72 - (60 * magFactor * classFactor);

        const getImpact = (val: number): { level: AnalysisData['impacts'][0]['level'], color: string } => {
            if (val > 0.8) return { level: 'Severe', color: 'text-red-500' };
            if (val > 0.6) return { level: 'High', color: 'text-orange-400' };
            if (val > 0.3) return { level: 'Moderate', color: 'text-yellow-400' };
            return { level: 'Low', color: 'text-green-400' };
        }
        
        const impacts = [
            { name: t('flare3D_impactAurora'), ...getImpact(magFactor * classFactor * 0.8) },
            { name: t('flare3D_impactRadio'), ...getImpact(magFactor * classFactor) },
            { name: t('flare3D_impactSat'), ...getImpact(magFactor * classFactor * 0.9) },
            { name: t('flare3D_impactGrid'), ...getImpact(magFactor * classFactor * 0.5) },
        ];

        setAnalysisData({ velocity: { value: velocity, unit: 'km/s' }, density: { value: density, unit: 'p/cm³' }, arrival: { value: arrival, unit: 'hrs' }, impacts });
    }, 1500);


    setTimeout(() => {
      setIsAnimating(false);
    }, 4000); // Cooldown to match animation duration
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (value <= 9) {
        setFlareClass('M');
        setFlareMagnitude(value);
    } else {
        setFlareClass('X');
        setFlareMagnitude(value - 9);
    }
  };

  const getSliderValue = () => {
      return flareClass === 'M' ? flareMagnitude : flareMagnitude + 9;
  }
  
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
      
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-0">
        
        {/* Left Panel - Controls & Analysis */}
        <aside className="lg:col-span-2 flex flex-col gap-6">
          <InfoPanel 
            title={t('flare3D_controlsTitle')} 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>}
          >
             <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-cyan-300 mb-2">{t('flare3D_sourceRegion')}</label>
                    <div className="relative w-40 h-40 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-full mx-auto">
                        {ACTIVE_REGIONS.map(region => (
                           <button 
                                key={region.name} 
                                onClick={() => setSourceRegion(region)}
                                className={`absolute w-6 h-6 rounded-full transition-all duration-200 flex items-center justify-center
                                  ${sourceRegion.name === region.name ? 'bg-cyan-400 ring-2 ring-white' : 'bg-black/50 hover:bg-cyan-500/50'}
                                `}
                                style={{ top: `calc(${region.y * 100}% - 12px)`, left: `calc(${region.x * 100}% - 12px)`}}
                                title={region.name}
                            >
                                {sourceRegion.name === region.name && <div className="w-2 h-2 bg-black rounded-full"></div>}
                            </button>
                        ))}
                    </div>
                 </div>
                 <div>
                     <label className="block text-xs font-bold text-cyan-300 mb-2">{t('flare3D_intensity')} <span className="font-orbitron text-base text-white">{flareClass}{flareMagnitude}</span></label>
                     <input 
                        type="range" 
                        min="1" 
                        max="18" 
                        value={getSliderValue()}
                        onChange={handleSliderChange}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" 
                     />
                     <div className="flex justify-between text-xs text-cyan-400/70 mt-1">
                         <span>M1</span>
                         <span>M9</span>
                         <span>X9</span>
                     </div>
                 </div>
                 <button
                    onClick={triggerFlare}
                    disabled={isAnimating}
                    className="w-full mt-2 py-3 font-orbitron text-lg rounded-md border-2 transition-all duration-300 bg-red-500/20 border-red-400 text-red-300 hover:bg-red-400 hover:text-gray-900 hover:shadow-lg hover:shadow-red-400/50 active:scale-95 disabled:bg-gray-600/30 disabled:border-gray-500 disabled:text-gray-500 disabled:cursor-wait"
                    >
                    {isAnimating ? t('flare3D_inProgress') : t('flare3D_initiateButton')}
                </button>
             </div>
          </InfoPanel>
           <InfoPanel 
            title={t('flare3D_liveAnalysis')} 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
            className="flex-grow"
            headerAction={
                analysisData && <AnalysisAudioPlayer analysisData={analysisData} language={language} />
            }
          >
              <AnalysisReadout data={analysisData} />
          </InfoPanel>
        </aside>

        {/* Center - 3D View */}
        <main className="lg:col-span-3 flex items-center justify-center min-h-[400px] lg:min-h-0 relative bg-black/30 rounded-lg border border-cyan-800/60 overflow-hidden">
          <ThreeJS_Sun 
            isFlareActive={isFlareActive}
            flareClass={flareClass}
            flareMagnitude={flareMagnitude}
            sourceRegion={sourceRegion}
          />
           <div className="absolute inset-0 pointer-events-none bg-grid-cyan-500/10"></div>
           <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 10%, transparent 90%, rgba(0,0,0,0.5) 100%)' }}></div>
        </main>
      </div>
    </div>
  );
};
