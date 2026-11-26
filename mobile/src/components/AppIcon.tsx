import React from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Battery,
  Bell,
  Car,
  CheckCircle,
  ChevronRight,
  Clock,
  Crosshair,
  Home,
  MapPin,
  Navigation,
  Phone,
  Search,
  Settings,
  ShieldCheck,
  User,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react-native';

export type IconName =
  | 'home'
  | 'user'
  | 'users'
  | 'car'
  | 'location'
  | 'navigation'
  | 'phone'
  | 'bell'
  | 'settings'
  | 'wifi'
  | 'wifi-off'
  | 'battery'
  | 'check-circle'
  | 'clock'
  | 'search'
  | 'arrow-left'
  | 'crosshair'
  | 'chevron-right'
  | 'shield'
  | 'alert';

const ICON_MAP = {
  home: Home,
  user: User,
  users: Users,
  car: Car,
  location: MapPin,
  navigation: Navigation,
  phone: Phone,
  bell: Bell,
  settings: Settings,
  wifi: Wifi,
  'wifi-off': WifiOff,
  battery: Battery,
  'check-circle': CheckCircle,
  clock: Clock,
  search: Search,
  'arrow-left': ArrowLeft,
  crosshair: Crosshair,
  'chevron-right': ChevronRight,
  shield: ShieldCheck,
  alert: AlertCircle,
};

export const AppIcon: React.FC<{ name: IconName; size?: number; color?: string; strokeWidth?: number }> = ({
  name,
  size = 20,
  color = '#111111',
  strokeWidth = 2,
}) => {
  const IconComp = ICON_MAP[name];
  return <IconComp size={size} color={color} strokeWidth={strokeWidth} />;
};
