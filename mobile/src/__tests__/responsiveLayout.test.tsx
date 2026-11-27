import React from 'react';
import renderer, { act } from 'react-test-renderer';

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
  { width: 430, height: 932 },
];

let mockCurrentViewport = { width: 320, height: 568 };

jest.mock('react-native', () => {
  const React = require('react');
  const mockComp = (name: string) => (props: any) => React.createElement(name, props, props.children);
  return {
    Platform: { OS: 'android', Version: 33, select: (o: any) => o.android || o.default },
    StyleSheet: { create: (s: any) => s, absoluteFillObject: {} },
    useWindowDimensions: () => mockCurrentViewport,
    Animated: {
      Value: class {
        constructor(_v: number) {}
      },
      View: mockComp('AnimatedView'),
      timing: () => ({ start: jest.fn() }),
      spring: () => ({ start: jest.fn() }),
      sequence: () => ({ start: jest.fn() }),
      parallel: () => ({ start: jest.fn() }),
      loop: () => ({ start: jest.fn(), stop: jest.fn() }),
    },
    Alert: { alert: jest.fn() },
    Keyboard: { dismiss: jest.fn() },
    Linking: { openSettings: jest.fn() },
    PermissionsAndroid: {
      PERMISSIONS: { ACCESS_FINE_LOCATION: 'fine', ACCESS_COARSE_LOCATION: 'coarse', ACCESS_BACKGROUND_LOCATION: 'bg' },
      RESULTS: { GRANTED: 'granted', NEVER_ASK_AGAIN: 'never_ask_again' },
      request: jest.fn().mockResolvedValue('granted'),
      check: jest.fn().mockResolvedValue(true),
    },
    View: mockComp('View'),
    Text: mockComp('Text'),
    TextInput: mockComp('TextInput'),
    TouchableOpacity: mockComp('TouchableOpacity'),
    ScrollView: mockComp('ScrollView'),
    FlatList: (props: any) =>
      React.createElement(
        'FlatList',
        props,
        props.data?.length
          ? props.data.map((item: any, idx: number) =>
              React.createElement('Item', { key: props.keyExtractor ? props.keyExtractor(item, idx) : idx }, props.renderItem({ item, index: idx }))
            )
          : props.ListEmptyComponent || null
      ),
    Image: mockComp('Image'),
    ActivityIndicator: mockComp('ActivityIndicator'),
    KeyboardAvoidingView: mockComp('KeyboardAvoidingView'),
    RefreshControl: mockComp('RefreshControl'),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaProvider: ({ children }: any) => React.createElement('SafeAreaProvider', null, children),
    SafeAreaView: ({ children, ...p }: any) => React.createElement('SafeAreaView', p, children),
    useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }),
  };
});

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const stub = (props: any) => React.createElement('LucideIcon', props);
  return new Proxy({}, { get: () => stub });
});

jest.mock('react-native-maps', () => {
  const React = require('react');
  const MapView: any = ({ children, ...p }: any) => React.createElement('MapView', p, children);
  const Marker: any = ({ children, ...p }: any) => React.createElement('Marker', p, children);
  Marker.Animated = Marker;
  return {
    __esModule: true,
    default: MapView,
    Marker,
    AnimatedRegion: class {
      constructor(_cfg: any) {}
      timing() {
        return { start: jest.fn() };
      }
    },
    PROVIDER_GOOGLE: 'google',
  };
});

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: { AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'after_unlock' },
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn(),
}));

jest.mock('react-native-background-actions', () => ({
  isRunning: () => false,
  start: jest.fn(),
  stop: jest.fn(),
}));

jest.mock('react-native-geolocation-service', () => ({
  requestAuthorization: jest.fn().mockResolvedValue('granted'),
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock('../services/api', () => ({
  api: {
    get: jest.fn().mockResolvedValue({ data: { data: [] } }),
    post: jest.fn().mockResolvedValue({ data: { data: {} } }),
    patch: jest.fn().mockResolvedValue({ data: { data: {} } }),
    interceptors: { request: { use: jest.fn() } },
  },
}));

jest.mock('../services/socket', () => ({
  socketManager: {
    connect: jest.fn().mockResolvedValue(null),
    disconnect: jest.fn(),
  },
}));

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'drv-1',
      role: 'DRIVER',
      mobileNumber: '+15550000002',
      fullName: 'Thiruvananthapuram Subramanian Venkataraman',
      accountStatus: 'ACTIVE',
      vehicle: { registrationNumber: 'KA-01-CORPORATE-FLEET-9999', model: 'Toyota Innova Crysta', colour: 'White' },
    },
    loading: false,
    login: jest.fn(),
    updateUser: jest.fn(),
    logout: jest.fn(),
  }),
}));

import { LoginScreen } from '../screens/LoginScreen';
import { DriverDashboardScreen } from '../screens/driver/DriverDashboardScreen';
import { DriverProfileScreen } from '../screens/driver/DriverProfileScreen';
import { AdminDriversScreen } from '../screens/admin/AdminDriversScreen';
import { AdminActiveRidesScreen } from '../screens/admin/AdminActiveRidesScreen';
import { AdminDriverDetailsScreen } from '../screens/admin/AdminDriverDetailsScreen';
import { AdminLiveMapScreen } from '../screens/admin/AdminLiveMapScreen';
import { AdminProfileScreen } from '../screens/admin/AdminProfileScreen';

const longDriver = {
  id: 'drv-1',
  mobileNumber: '+91 9876543210',
  fullName: 'Thiruvananthapuram Subramanian Venkataraman',
  accountStatus: 'ACTIVE' as const,
  availabilityStatus: 'ON_RIDE' as const,
  internetConnected: false,
  gpsEnabled: true,
  vehicleRegistration: 'KA-01-CORPORATE-FLEET-9999',
  vehicleModel: 'Toyota Innova Crysta Touring Sport',
  capturedAt: new Date().toISOString(),
  rideStatus: 'RIDE_STARTED' as const,
};

describe('Responsive Layout Validation across 6 Mobile Viewports', () => {
  for (const vp of VIEWPORTS) {
    it(`renders all Driver and Admin screens cleanly at ${vp.width}x${vp.height}`, async () => {
      mockCurrentViewport = vp;

      const screens = [
        <LoginScreen key="login" />,
        <DriverDashboardScreen key="drv-dash" />,
        <DriverProfileScreen key="drv-prof" />,
        <AdminDriversScreen key="adm-drv" onSelectDriver={jest.fn()} />,
        <AdminActiveRidesScreen key="adm-rides" onOpenLiveMap={jest.fn()} />,
        <AdminDriverDetailsScreen key="adm-det" driver={longDriver} onBack={jest.fn()} onViewLiveLocation={jest.fn()} />,
        <AdminLiveMapScreen key="adm-map" driverId="drv-1" onBack={jest.fn()} />,
        <AdminProfileScreen key="adm-prof" />,
      ];

      for (const screen of screens) {
        let tree: renderer.ReactTestRenderer;
        await act(async () => {
          tree = renderer.create(screen);
        });
        expect(tree!.toJSON()).toBeTruthy();
        tree!.unmount();
      }
    });
  }
});
