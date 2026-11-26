import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isSmallPhone = width < 360;
  const isLandscape = width > height;

  const scaleFont = (base: number): number => {
    if (width < 340) return Math.max(12, Math.round(base * 0.92));
    if (width >= 414) return Math.round(base * 1.04);
    return base;
  };

  return {
    width,
    height,
    isSmallPhone,
    isLandscape,
    horizontalPadding: isSmallPhone ? 12 : 16,
    scaleFont,
  };
}
