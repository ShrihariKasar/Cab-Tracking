import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon, IconName } from '../components/AppIcon';
import { Theme } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { AdminActiveRidesScreen } from '../screens/admin/AdminActiveRidesScreen';
import { AdminDriverDetailsScreen } from '../screens/admin/AdminDriverDetailsScreen';
import { AdminDriversScreen } from '../screens/admin/AdminDriversScreen';
import { AdminLiveMapScreen } from '../screens/admin/AdminLiveMapScreen';
import { AdminProfileScreen } from '../screens/admin/AdminProfileScreen';
import { DriverDashboardScreen } from '../screens/driver/DriverDashboardScreen';
import { DriverProfileScreen } from '../screens/driver/DriverProfileScreen';
import type { DriverListItem } from '../types';

export const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const [driverTab, setDriverTab] = useState<'home' | 'profile'>('home');
  const [adminTab, setAdminTab] = useState<'drivers' | 'activeRides' | 'profile'>('drivers');
  const [selectedDriver, setSelectedDriver] = useState<DriverListItem | null>(null);
  const [liveMapDriverId, setLiveMapDriverId] = useState<string | null>(null);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  if (!user) return <LoginScreen />;

  if (user.role === 'DRIVER') {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <View style={styles.content}>
          {driverTab === 'home' ? <DriverDashboardScreen /> : <DriverProfileScreen />}
        </View>
        <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TabBtn label="Home" icon="home" active={driverTab === 'home'} onPress={() => setDriverTab('home')} />
          <TabBtn label="Profile" icon="user" active={driverTab === 'profile'} onPress={() => setDriverTab('profile')} />
        </View>
      </SafeAreaView>
    );
  }

  if (liveMapDriverId) {
    return <AdminLiveMapScreen driverId={liveMapDriverId} onBack={() => setLiveMapDriverId(null)} />;
  }

  if (selectedDriver) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <AdminDriverDetailsScreen
          driver={selectedDriver}
          onBack={() => setSelectedDriver(null)}
          onViewLiveLocation={(id) => setLiveMapDriverId(id)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        {adminTab === 'drivers' && <AdminDriversScreen onSelectDriver={setSelectedDriver} />}
        {adminTab === 'activeRides' && <AdminActiveRidesScreen onOpenLiveMap={setLiveMapDriverId} />}
        {adminTab === 'profile' && <AdminProfileScreen />}
      </View>
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TabBtn label="Drivers" icon="users" active={adminTab === 'drivers'} onPress={() => setAdminTab('drivers')} />
        <TabBtn label="Active Rides" icon="car" active={adminTab === 'activeRides'} onPress={() => setAdminTab('activeRides')} />
        <TabBtn label="Profile" icon="user" active={adminTab === 'profile'} onPress={() => setAdminTab('profile')} />
      </View>
    </SafeAreaView>
  );
};

const TabBtn: React.FC<{ label: string; icon: IconName; active: boolean; onPress: () => void }> = ({
  label,
  icon,
  active,
  onPress,
}) => (
  <TouchableOpacity onPress={onPress} style={styles.tab}>
    <AppIcon name={icon} size={20} color={active ? Theme.colors.primary : Theme.colors.textSecondary} />
    <Text style={[styles.tabLabel, { color: active ? Theme.colors.primary : Theme.colors.textSecondary }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Theme.colors.background },
  content: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.background },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    backgroundColor: Theme.colors.secondary,
    paddingTop: 8,
    minHeight: 58,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 3,
  },
  tabLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
});
