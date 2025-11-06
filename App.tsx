import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ControlPanel } from './components/ControlPanel';
import { MainDisplay } from './components/MainDisplay';
import { StatusFeed } from './components/StatusFeed';
import { DataDashboard } from './components/DataDashboard';
import { SolarFlare3D } from './components/SolarFlare3D';
import { MultiSpectrumView } from './components/HistoricalTimelapse';
import { MissionControl } from './components/MissionControl';
import { SolarForecast } from './components/SolarForecast';
import type { InstrumentSelection, AiaWavelength, SimulatedData, ProcessState, AiDataCache } from './types';
import { AIA_WAVELENGTHS } from './constants';
import { fetchGoesData, generateHmiData, generateSummary, generateSolarWindData, generateProtonFluxData, generateKpIndexData } from './services/simulationService';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

type Tab = 'observatory' | 'flareAnalysis' | 'multiSpectrum' | 'missionControl' | 'forecast';

function AppContent() {
  const { t } = useLanguage();
  const [selections, setSelections] = useState<InstrumentSelection>({
    AIA: false,
    HMI: false,
    GOES: false,
  });
  const [selectedAiaWavelength, setSelectedAiaWavelength] = useState<AiaWavelength>(AIA_WAVELENGTHS[2]);
  const [processState, setProcessState] = useState<ProcessState>('idle');
  const [statusMessages, setStatusMessages] = useState<string[]>([]);
  const [processedData, setProcessedData] = useState<SimulatedData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('observatory');
  const [displaySource, setDisplaySource] = useState<'AIA' | 'HMI'>('AIA');
  const [aiDataCache, setAiDataCache] = useState<AiDataCache | null>(null);

  const addStatusMessage = useCallback((message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].substring(0, 8);
    setStatusMessages(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  const updateAiCache = useCallback((updates: Partial<AiDataCache>) => {
    setAiDataCache(prev => ({
        ...(prev ?? { // Default structure for initial state
            advisorChatHistory: [],
            missionData: null,
            stormProbability: null,
            threatMatrix: null,
            newsFeed: null,
            sevenDayForecast: null,
        }),
        ...updates,
    }));
  }, []);


  useEffect(() => {
    // Reset display source preference if both are not selected
    if (!selections.AIA || !selections.HMI) {
      setDisplaySource('AIA');
    }
  }, [selections.AIA, selections.HMI]);

  const handleEngage = useCallback(async () => {
    if (processState === 'processing' || (selections.AIA === false && selections.HMI === false && selections.GOES === false)) {
        return;
    }
    
    setAiDataCache(null); // Reset all AI analysis for new data
    setProcessState('processing');
    setStatusMessages([]);
    setProcessedData(null);

    const steps = [
      { delay: 500, message: "Initializing deep space network connection..." },
      { delay: 1000, message: "Authenticating with SDO & NOAA..." },
      ...(selections.AIA ? [{ delay: 1500, message: `Requesting AIA data for ${selectedAiaWavelength.name}Å...` }] : []),
      ...(selections.HMI ? [{ delay: 1500, message: "Downloading HMI magnetogram..." }] : []),
      ...(selections.GOES ? [{ delay: 1500, message: "Fetching live GOES X-ray flux data..." }] : []),
      { delay: 2000, message: "Data stream inbound. Beginning preprocessing..." },
      ...(selections.AIA ? [{ delay: 1200, message: "Calibrating AIA spectral imagery..." }] : []),
      ...(selections.HMI ? [{ delay: 1200, message: "Analyzing magnetic field topology..." }] : []),
      ...(selections.GOES ? [{ delay: 1200, message: "Cross-referencing flare events..." }] : []),
      { delay: 800, message: "Querying ACE & DSCOVR for solar wind data..." },
      { delay: 800, message: "Assessing geomagnetic Kp-index..." },
      { delay: 2500, message: "Generating visualizations..." },
    ];

    let cumulativeDelay = 0;
    steps.forEach(step => {
      cumulativeDelay += step.delay;
      setTimeout(() => {
        addStatusMessage(step.message);
      }, cumulativeDelay);
    });

    setTimeout(async () => {
      try {
        const goesData = selections.GOES ? await fetchGoesData() : undefined;
        if(selections.GOES) addStatusMessage('SUCCESS: Live GOES data retrieved from NOAA.');

        const hmiData = selections.HMI ? generateHmiData() : undefined;
        if(selections.HMI) addStatusMessage('SUCCESS: HMI sunspot analysis complete (simulated).');
        
        addStatusMessage('Analyzing interplanetary space environment...');
        const solarWindData = generateSolarWindData();
        const protonFluxData = generateProtonFluxData();
        const kpIndexData = generateKpIndexData();
        addStatusMessage('SUCCESS: Space environment analysis complete.');

        const summary = generateSummary(selections, selectedAiaWavelength, hmiData, goesData, solarWindData, protonFluxData, kpIndexData);
        
        setProcessedData({
          selections,
          wavelength: selectedAiaWavelength,
          goesData,
          hmiData,
          summary,
          solarWindData,
          protonFluxData,
          kpIndexData,
        });
        addStatusMessage("Data processing complete. Standby for output.");
      } catch (error) {
        console.error("Data processing failed:", error);
        addStatusMessage("ERROR: Failed to retrieve live solar data. Check network.");
        
        // Still generate a partial report if possible
        const hmiData = selections.HMI ? generateHmiData() : undefined;
        const solarWindData = generateSolarWindData();
        const protonFluxData = generateProtonFluxData();
        const kpIndexData = generateKpIndexData();
        const summary = generateSummary(selections, selectedAiaWavelength, hmiData, undefined, solarWindData, protonFluxData, kpIndexData);

        setProcessedData({
          selections,
          wavelength: selectedAiaWavelength,
          goesData: undefined,
          hmiData,
          summary,
          solarWindData,
          protonFluxData,
          kpIndexData,
        });

      } finally {
        setProcessState('complete');
      }
    }, cumulativeDelay);
  }, [processState, selections, selectedAiaWavelength, addStatusMessage]);

  const TabButton: React.FC<{ tabId: Tab; currentTab: Tab; onClick: (tabId: Tab) => void; children: React.ReactNode; }> = ({ tabId, currentTab, onClick, children }) => {
    const isActive = tabId === currentTab;
    return (
      <button
        onClick={() => onClick(tabId)}
        className={`px-6 py-2 font-orbitron text-sm tracking-widest transition-all duration-300 rounded-t-lg border-b-2
          ${isActive 
            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200' 
            : 'bg-transparent border-transparent text-cyan-500 hover:bg-cyan-500/10 hover:text-cyan-300'
          }
        `}
      >
        {children}
      </button>
    );
  };

  const isHmiVisible = (selections.HMI && !selections.AIA) || (selections.HMI && selections.AIA && displaySource === 'HMI');

  return (
    <div className="min-h-screen bg-gray-900 bg-grid-cyan-500/10 text-cyan-300 p-4 lg:p-6 flex flex-col">
      <Header />
      
      <nav className="mt-4 flex items-center border-b border-cyan-500/30 overflow-x-auto">
        <TabButton tabId="observatory" currentTab={activeTab} onClick={setActiveTab}>
          {t('tab_observatory')}
        </TabButton>
        <TabButton tabId="flareAnalysis" currentTab={activeTab} onClick={setActiveTab}>
          {t('tab_flareAnalysis')}
        </TabButton>
        <TabButton tabId="multiSpectrum" currentTab={activeTab} onClick={setActiveTab}>
          {t('tab_multiSpectrum')}
        </TabButton>
         <TabButton tabId="missionControl" currentTab={activeTab} onClick={setActiveTab}>
          {t('tab_missionControl')}
        </TabButton>
         <TabButton tabId="forecast" currentTab={activeTab} onClick={setActiveTab}>
          {t('tab_forecast')}
        </TabButton>
      </nav>

      {activeTab === 'observatory' && (
        <main className="flex-grow flex flex-col gap-6 mt-4 min-h-0">
          {/* Top Section for Sun Display */}
          <section className="flex items-center justify-center">
            <MainDisplay 
              wavelength={selectedAiaWavelength} 
              isProcessing={processState === 'processing'} 
              showHmi={isHmiVisible}
              selections={selections}
              displaySource={displaySource}
              setDisplaySource={setDisplaySource}
            />
          </section>

          {/* Bottom Section for Panels */}
          <section className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
            <aside className="lg:col-span-3 min-h-0">
               <ControlPanel 
                selections={selections}
                setSelections={setSelections}
                selectedAiaWavelength={selectedAiaWavelength}
                setSelectedAiaWavelength={setSelectedAiaWavelength}
                onEngage={handleEngage}
                isProcessing={processState === 'processing'}
              />
            </aside>
            <aside className="lg:col-span-4 min-h-0">
              <StatusFeed messages={statusMessages} />
            </aside>
            <aside className="lg:col-span-5 min-h-0">
              <DataDashboard 
                processState={processState}
                data={processedData}
                advisorChatHistory={aiDataCache?.advisorChatHistory}
                updateAiCache={updateAiCache}
              />
            </aside>
          </section>
        </main>
      )}

      {activeTab === 'flareAnalysis' && (
         <main className="flex-grow mt-4 min-h-0">
            <SolarFlare3D />
        </main>
      )}
      
      {activeTab === 'multiSpectrum' && (
         <main className="flex-grow mt-4 min-h-0">
            <MultiSpectrumView />
        </main>
      )}

      {activeTab === 'missionControl' && (
         <main className="flex-grow mt-4 min-h-0">
            <MissionControl 
              missionData={aiDataCache?.missionData}
              updateAiCache={updateAiCache}
            />
        </main>
      )}
      
      {activeTab === 'forecast' && (
         <main className="flex-grow mt-4 min-h-0">
            <SolarForecast 
              data={processedData} 
              processState={processState} 
              forecastData={aiDataCache}
              updateAiCache={updateAiCache}
            />
        </main>
      )}

    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}