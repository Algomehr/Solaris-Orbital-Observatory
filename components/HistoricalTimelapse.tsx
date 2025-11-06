import React, { useState, useEffect } from 'react';
import { AIA_WAVELENGTHS } from '../constants';
import type { AiaWavelength } from '../types';

const FeaturedImage: React.FC<{ wavelength: AiaWavelength }> = ({ wavelength }) => {
  const [imageUrl, setImageUrl] = useState(wavelength.imageUrl);

  useEffect(() => {
    // Bust cache to get the latest image
    setImageUrl(`${wavelength.imageUrl}?t=${new Date().getTime()}`);
  }, [wavelength]);

  return (
    <div className="w-full h-full p-4 bg-black/50 border-2 border-cyan-700/50 rounded-lg flex items-center justify-center relative shadow-2xl shadow-cyan-500/20">
      <div className="w-full aspect-square rounded-full overflow-hidden relative">
        <img
          key={imageUrl}
          src={imageUrl}
          alt={`AIA ${wavelength.name}Å`}
          className="w-full h-full object-cover rounded-full opacity-90"
        />
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: `inset 0 0 80px 20px black, inset 0 0 15px 5px ${wavelength.color}`
          }}
        ></div>
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 bg-black/70 rounded-md border border-cyan-700/50 text-xs text-center">
        <p className="font-bold tracking-wider">AIA {wavelength.name}Å - {wavelength.temp}</p>
      </div>
    </div>
  );
};

const WavelengthThumbnail: React.FC<{ wavelength: AiaWavelength; isSelected: boolean; onClick: () => void; }> = ({ wavelength, isSelected, onClick }) => {
  return (
    <button onClick={onClick} className={`w-full aspect-square relative rounded-md overflow-hidden border-2 transition-all duration-200 ${isSelected ? 'border-cyan-400' : 'border-transparent hover:border-cyan-600'}`}>
      <img src={`${wavelength.imageUrl}?t=${new Date().getTime()}`} alt={wavelength.name} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
        <span className="font-orbitron text-white text-lg font-bold">{wavelength.name}Å</span>
      </div>
       {isSelected && <div className="absolute inset-0 border-2 border-cyan-400 animate-pulse rounded-md"></div>}
    </button>
  );
};

export const MultiSpectrumView: React.FC = () => {
    const [selectedWavelength, setSelectedWavelength] = useState<AiaWavelength>(AIA_WAVELENGTHS[2]);

    return (
        <div className="w-full h-full flex flex-col p-4 gap-6 animate-fadeIn">
             <header className="text-center">
                <h2 className="font-orbitron text-2xl text-cyan-200 tracking-widest">
                    MULTI-SPECTRUM VIEW
                </h2>
                <p className="text-cyan-400/80">
                    Latest solar imagery from the Atmospheric Imaging Assembly (AIA) across multiple wavelengths.
                </p>
            </header>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
                <main className="lg:col-span-9 flex items-center justify-center">
                    <FeaturedImage wavelength={selectedWavelength} />
                </main>
                <aside className="lg:col-span-3 flex flex-col">
                    <div className="p-4 bg-gray-900/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg h-full shadow-lg shadow-cyan-500/10 flex flex-col">
                        <h3 className="font-orbitron text-cyan-300 border-b-2 border-cyan-500/30 pb-1 mb-3 text-sm tracking-wider uppercase flex-shrink-0">
                            SELECT WAVELENGTH
                        </h3>
                        <div className="flex-grow overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
                            {AIA_WAVELENGTHS.map(w => (
                                <WavelengthThumbnail 
                                    key={w.name}
                                    wavelength={w}
                                    isSelected={selectedWavelength.name === w.name}
                                    onClick={() => setSelectedWavelength(w)}
                                />
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};
