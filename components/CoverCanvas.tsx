
import React from 'react';
import { BookConfig, TRIM_DIMENSIONS, TitleTexture } from '../types';
import { getFullWrapDimensions } from '../utils/calculations';

interface CoverCanvasProps {
  config: BookConfig;
  isPaid?: boolean;
}

const enc = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

const getTextureCss = (texture: TitleTexture, opacity: number): string => {
  const o = Math.min(Math.max(opacity, 0.1), 1).toFixed(2);
  switch (texture) {
    case TitleTexture.GRAIN:
      return enc(`<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='${o}'/></svg>`);
    case TitleTexture.CRISS_CROSS:
      return enc(`<svg width='10' height='10' xmlns='http://www.w3.org/2000/svg'><path d='M10 0v10H0' fill='none' stroke='white' stroke-width='0.5' opacity='${o}'/></svg>`);
    case TitleTexture.LINEN:
      return enc(`<svg width='40' height='40' xmlns='http://www.w3.org/2000/svg'><path d='M0 10h40M0 20h40M0 30h40M10 0v40M20 0v40M30 0v40' fill='none' stroke='white' stroke-width='0.5' opacity='${o}'/></svg>`);
    case TitleTexture.PAPER:
      return enc(`<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='0.05' numOctaves='2'/></filter><rect width='100' height='100' filter='url(#f)' opacity='${o}'/></svg>`);
    case TitleTexture.DOTS:
      return enc(`<svg width='10' height='10' xmlns='http://www.w3.org/2000/svg'><circle cx='2' cy='2' r='1' fill='white' opacity='${o}'/></svg>`);
    case TitleTexture.ETCHED:
      return `repeating-linear-gradient(45deg, rgba(255,255,255,${o}) 0px, rgba(255,255,255,${o}) 1px, transparent 1px, transparent 4px)`;
    case TitleTexture.SHADING:
      return `linear-gradient(to bottom, rgba(0,0,0,${o}), transparent, rgba(255,255,255,${o}))`;
    default:
      return 'none';
  }
};

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

  const getTitleStyle = (): React.CSSProperties => {
    const base = getTextStyle();
    const opacity = config.titleTextureOpacity ?? 0.45;
    const texture = getTextureCss(config.titleTexture, opacity);

    if (config.titleTexture === TitleTexture.NONE) return base;

    return {
      ...base,
      backgroundImage: `${texture}, linear-gradient(${config.mainColor}, ${config.mainColor})`,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      display: 'inline-block',
    };
  };

  return (
    <div className="relative group">
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
            {config.title.replace(/\n/g, ' ')} <span className="mx-2 opacity-60">|</span> {config.author}
          </h2>
        </div>

        {/* FRONT COVER */}
        <div style={{ ...sectionStyle, left: `${(dims.bleed + dims.trimWidth + dims.spineWidth) * scale}px`, width: `${dims.trimWidth * scale}px` }}>
          <div className="flex flex-col h-full justify-between py-12 px-6">
            <div className="space-y-4">
              <h1 style={{ ...getTitleStyle(), fontSize: '2.5rem', lineHeight: '1.1', whiteSpace: 'pre-wrap' }} className="font-black drop-shadow-2xl">
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
