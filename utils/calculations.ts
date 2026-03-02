
import { BLEED, WHITE_PAPER_THICKNESS } from '../constants';
import { TRIM_DIMENSIONS, TrimSize } from '../types';

export function calculateSpineWidth(pageCount: number): number {
  return Math.max(0.06, pageCount * WHITE_PAPER_THICKNESS);
}

export function getFullWrapDimensions(trimSize: TrimSize, pageCount: number) {
  const trim = TRIM_DIMENSIONS[trimSize];
  const spine = calculateSpineWidth(pageCount);
  
  // Full Width = Bleed (Left) + Back + Spine + Front + Bleed (Right)
  const fullWidth = (BLEED * 2) + (trim.w * 2) + spine;
  // Full Height = Bleed (Top) + Height + Bleed (Bottom)
  const fullHeight = (BLEED * 2) + trim.h;

  return {
    width: fullWidth,
    height: fullHeight,
    spineWidth: spine,
    trimWidth: trim.w,
    trimHeight: trim.h,
    bleed: BLEED
  };
}
