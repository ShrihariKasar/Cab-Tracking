import { Platform } from 'react-native';

export const Theme = {
  colors: {
    primary: '#000000',
    secondary: '#FFFFFF',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceMuted: '#EFEFEF',
    border: '#E5E5E5',
    text: '#111111',
    textSecondary: '#717171',
    textMuted: '#717171',
    success: '#16A34A',
    green: '#16A34A',
    warning: '#F59E0B',
    error: '#DC2626',
    red: '#DC2626',
  },
  fonts: {
    sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'Inter, system-ui, sans-serif' }),
    medium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'Inter, system-ui, sans-serif' }),
  },
  radius: {
    card: 16,
    sheet: 24,
    button: 12,
    pill: 999,
  },
  shadow: {
    floating: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
  },
} as const;

export const CLEAN_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d9e7f5' }] },
];

export function getTimeGreeting(): string {
  const hr = new Date().getHours();
  if (hr < 12) return 'Good morning';
  if (hr < 17) return 'Good afternoon';
  return 'Good evening';
}
