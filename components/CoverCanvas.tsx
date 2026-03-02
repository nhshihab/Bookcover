
import React from 'react';
import { BookConfig, TRIM_DIMENSIONS } from '../types';
import { getFullWrapDimensions } from '../utils/calculations';

interface CoverCanvasProps {
  config: BookConfig;
  isPaid?: boolean;
}

const CoverCanvas: React.FC<CoverCanvasProps> = ({ config, isPaid = false }) => {
  const dims = getFullWrapDimensions(config.trimSize, config.pageCount);
  
  // Scale for preview (inches to pixels, e.g., 60px per inch)
  const scale = 50;
  
  const containerStyle: React.CSSProperties = {
    width: `${dims.width * scale}px`,
    height: `${dims.height * scale}px`,
    position: 'relative',
    backgroundColor: '#333',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
    transition: 'all 0.3s ease'
  };

  const sectionStyle: React.CSSProperties = {
    position: 'absolute',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '20px',
  };

  const getFontFamily = (f: string) => `"${f}", serif`;
  const getTextStyle = (isSpine = false): React.CSSProperties => ({
    fontFamily: getFontFamily(isSpine ? config.spineFontFamily : config.fontFamily),
    color: config.mainColor,
    textTransform: config.fontStyle === 'Capitals' ? 'uppercase' : 'none',
  });

  return (
    <div className="relative group">
      {/* Fix: Merged duplicate style attributes into a single one for cover-wrap */}
      <div id="cover-wrap" className="bg-cover bg-center" 
           style={{ ...containerStyle, backgroundImage: config.generatedImageUrl ? `url(${config.generatedImageUrl})` : 'none' }}>
        
        {/* Overlay if image exists */}
        {config.generatedImageUrl && <div className="absolute inset-0 bg-black/30" />}

        {/* GUIDES (Visible only in preview) */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Bleed Area */}
          <div className="absolute inset-0 border-[6px] border-dashed border-red-500/20 z-50" />
          {/* Spine Markers */}
          <div className="absolute h-full border-x border-dashed border-white/20" 
               style={{ left: `${(dims.bleed + dims.trimWidth) * scale}px`, width: `${dims.spineWidth * scale}px` }} />
        </div>

        {/* BACK COVER */}
        <div style={{ ...sectionStyle, left: `${dims.bleed * scale}px`, width: `${dims.trimWidth * scale}px` }}>
          <div className="p-8">
            <p className="text-white text-sm leading-relaxed drop-shadow-md" style={{ fontFamily: 'Crimson Text' }}>
              {config.blurb || "Add your back cover blurb here. This is where you entice readers with your book's description..."}
            </p>
          </div>
        </div>

        {/* SPINE */}
        <div style={{ 
          ...sectionStyle, 
          left: `${(dims.bleed + dims.trimWidth) * scale}px`, 
          width: `${dims.spineWidth * scale}px`,
          backgroundColor: 'rgba(0,0,0,0.4)',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed'
        }}>
          <h2 style={getTextStyle(true)} className="text-lg font-bold drop-shadow-lg">
            {config.title} <span className="mx-2 opacity-60">|</span> {config.author}
          </h2>
        </div>

        {/* FRONT COVER */}
        <div style={{ ...sectionStyle, left: `${(dims.bleed + dims.trimWidth + dims.spineWidth) * scale}px`, width: `${dims.trimWidth * scale}px` }}>
          <div className="flex flex-col h-full justify-between py-12 px-6">
            <div className="space-y-4">
              <h1 style={{ ...getTextStyle(), fontSize: '2.5rem', lineHeight: '1.1' }} className="font-black drop-shadow-2xl">
                {config.title || "Your Book Title"}
              </h1>
              {config.subtitle && (
                <p style={{ ...getTextStyle(), fontSize: '1rem' }} className="italic opacity-90 drop-shadow-lg">
                  {config.subtitle}
                </p>
              )}
            </div>
            
            <div className="w-16 h-1 bg-yellow-500 mx-auto" />
            
            <p style={{ ...getTextStyle(), fontSize: '1.25rem' }} className="font-semibold tracking-widest drop-shadow-lg">
              {config.author || "Author Name"}
            </p>
          </div>
        </div>

        {/* WATERMARK */}
        {!isPaid && (
          <div className="absolute inset-0 flex items-center justify-center rotate-45 pointer-events-none opacity-20 z-50">
            <span className="text-6xl font-black text-white border-8 border-white p-4">PREVIEW - BOOKCOVERBEE</span>
          </div>
        )}
      </div>
      
      {/* Dimension Helper */}
      <div className="mt-4 flex justify-between text-xs text-slate-400 font-mono">
        <span>Total Width: {dims.width.toFixed(3)}"</span>
        <span>Spine: {dims.spineWidth.toFixed(3)}"</span>
        <span>Height: {dims.height.toFixed(3)}"</span>
      </div>
    </div>
  );
};

export default CoverCanvas;
