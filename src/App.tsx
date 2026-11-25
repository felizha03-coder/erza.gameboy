import React, { useState } from 'react';
import { ErzaGameBoyConsole } from './components/ErzaGameBoyConsole';
import { ThreeAmbientScene } from './components/ThreeAmbientScene';
import { ThemeMode } from './types/erza';
import { loadErzaState } from './utils/erzaStorage';

export function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadErzaState().themeMode);

  return (
    <div
      className={`min-h-screen w-full relative overflow-x-hidden transition-colors duration-700 ${
        themeMode === 'NIGHT' ? 'erza-backdrop-night' : 'erza-backdrop-day'
      }`}
    >
      {/* Subtle Retro Film Grain Overlay */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-0 pointer-events-none opacity-65 ${
          themeMode === 'NIGHT' ? 'erza-grain-night' : 'erza-grain'
        }`}
      />

      {/* Ambient Three.js 3D Smiley Coins, Clouds, Stars & Mini Cartridges */}
      <ThreeAmbientScene themeMode={themeMode} />

      {/* Centerpiece Interactive Sky-Blue Game Boy Console */}
      <ErzaGameBoyConsole themeMode={themeMode} onChangeThemeMode={setThemeMode} />
    </div>
  );
}

export default App;
