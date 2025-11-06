import React from 'react';
import type { InstrumentSelection, AiaWavelength } from '../types';
import { AIA_WAVELENGTHS, INSTRUMENTS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface ControlPanelProps {
  selections: InstrumentSelection;
  setSelections: React.Dispatch<React.SetStateAction<InstrumentSelection>>;
  selectedAiaWavelength: AiaWavelength;
  setSelectedAiaWavelength: React.Dispatch<React.SetStateAction<AiaWavelength>>;
  onEngage: () => void;
  isProcessing: boolean;
}

const PanelSection: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <div>
    <h3 className="font-orbitron text-cyan-300 border-b-2 border-cyan-500/30 pb-1 mb-3 text-sm tracking-wider uppercase">
      {title}
    </h3>
    {children}
  </div>
);

const CustomCheckbox: React.FC<{ id: string; label: string; description: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ id, label, description, checked, onChange }) => (
    <label htmlFor={id} className="flex items-center p-2 rounded-md hover:bg-cyan-500/10 cursor-pointer transition-colors duration-200">
        <div className="relative flex items-center">
            <input 
                id={id}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="appearance-none w-5 h-5 border-2 border-cyan-400 rounded-sm bg-gray-800 checked:bg-cyan-400 transition-colors duration-200"
            />
            {checked && (
                <svg className="absolute left-0.5 top-0.5 w-4 h-4 text-gray-900 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
            )}
        </div>
        <div className="ml-3 rtl:mr-3 rtl:ml-0">
            <span className="font-bold text-gray-100">{label}</span>
            <p className="text-xs text-cyan-300/70">{description}</p>
        </div>
    </label>
);


export const ControlPanel: React.FC<ControlPanelProps> = ({ selections, setSelections, selectedAiaWavelength, setSelectedAiaWavelength, onEngage, isProcessing }) => {
  const { t } = useLanguage();
  const handleInstrumentChange = (instrument: keyof InstrumentSelection) => {
    setSelections(prev => ({ ...prev, [instrument]: !prev[instrument] }));
  };
  
  const isDisabled = Object.values(selections).every(v => v === false);

  return (
    <div className="p-4 bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg flex flex-col h-full shadow-lg shadow-cyan-500/10">
      <h2 className="font-orbitron text-lg text-center mb-4 text-cyan-200 tracking-widest">{t('controlPanel_title')}</h2>
      <div className="space-y-6 flex-grow">
        <PanelSection title={t('controlPanel_dataSource')}>
          <div className="space-y-1">
            {INSTRUMENTS.map(inst => (
                 <CustomCheckbox 
                    key={inst.id}
                    id={`inst-${inst.id}`}
                    label={inst.name}
                    description={inst.description}
                    checked={selections[inst.id as keyof InstrumentSelection]}
                    onChange={() => handleInstrumentChange(inst.id as keyof InstrumentSelection)}
                 />
            ))}
          </div>
        </PanelSection>

        <PanelSection title={t('controlPanel_aiaFilter')}>
          <div className="grid grid-cols-4 gap-2">
            {AIA_WAVELENGTHS.map(w => (
              <button
                key={w.name}
                onClick={() => setSelectedAiaWavelength(w)}
                disabled={!selections.AIA}
                className={`p-2 text-center rounded-md font-bold text-sm transition-all duration-200
                  ${selectedAiaWavelength.name === w.name ? 'bg-cyan-400 text-gray-900 shadow-md shadow-cyan-400/50' : 'bg-gray-700/50 hover:bg-cyan-500/20'}
                  ${!selections.AIA ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {w.name}Å
              </button>
            ))}
          </div>
        </PanelSection>
      </div>

      <button
        onClick={onEngage}
        disabled={isProcessing || isDisabled}
        className={`w-full mt-6 py-3 font-orbitron text-lg rounded-md border-2 transition-all duration-300
          ${isProcessing || isDisabled 
            ? 'bg-gray-600/30 border-gray-500 text-gray-500 cursor-not-allowed' 
            : 'bg-cyan-500/20 border-cyan-400 text-cyan-300 hover:bg-cyan-400 hover:text-gray-900 hover:shadow-lg hover:shadow-cyan-400/50 active:scale-95'
          }
        `}
      >
        {isProcessing ? t('controlPanel_processing') : t('controlPanel_engage')}
      </button>
    </div>
  );
};
