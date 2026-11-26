import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/AppIcon';
import { CustomVehicleMarker } from '../../components/CustomVehicleMarker';
import { FloatingBottomSheet } from '../../components/FloatingBottomSheet';
import { StatusPill } from '../../components/StatusPill';
import { CLEAN_MAP_STYLE, getTimeGreeting, Theme } from '../../config/theme';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { gpsService, type GpsStatusSnapshot } from '../../services/gpsService';
import { useResponsive } from '../../utils/responsive';

export const DriverDashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { horizontalPadding, scaleFont } = useResponsive();
  const [gps, setGps] = useState<GpsStatusSnapshot>(gpsService.getSnapshot());
  const [rideStarted, setRideStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const statusScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const unsub = gpsService.subscribe(setGps);
    gpsService.checkAndRequestPermissions();
    gpsService.checkConnectivity();
    return unsub;
  }, []);

  const pulseStatus = () => {
    Animated.sequence([
      Animated.timing(statusScale, { toValue: 1.05, duration: 140, useNativeDriver: true }),
      Animated.timing(statusScale, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start();
  };

  const handleStartRide = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const hasPerm = await gpsService.checkAndRequestPermissions();
      if (!hasPerm) return;

      const hasInternet = await gpsService.checkConnectivity();
      if (!hasInternet) {
        Alert.alert(
          'No Internet Connection',
          'Please turn ON your mobile data or Wi-Fi to share your live location.'
        );
        return;
      }

      let currentCoords;
      try {
        currentCoords = await gpsService.getCurrentPosition();
      } catch {
        Alert.alert('Location Disabled', 'Please turn ON your device location to start your ride.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }

      await api.post('/rides/start', currentCoords);
      await gpsService.startRideTracking(user.id);
      setRideStarted(true);
      pulseStatus();
    } catch (err: any) {
      Alert.alert('Start Ride Error', err?.response?.data?.message || 'Unable to start ride.');
    } finally {
      setBusy(false);
    }
  };

  const handleEndRide = () => {
    Alert.alert('End Ride', 'Are you sure you want to end the current ride?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Ride',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            const last = gpsService.getSnapshot().lastCapturedLocation;
            await gpsService.stopRideTracking();
            await api.post('/rides/end', last || {});
            setRideStarted(false);
            pulseStatus();
          } catch (err: any) {
            Alert.alert('End Ride Error', err?.response?.data?.message || 'Unable to end ride.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const lat = gps.lastCapturedLocation?.latitude ?? 12.9716;
  const lng = gps.lastCapturedLocation?.longitude ?? 77.5946;
  const accuracyText = gps.lastCapturedLocation ? `±${Math.round(gps.lastCapturedLocation.accuracy)}m` : 'Locating';

  return (
    <View style={styles.container}>
      {/* Top Floating Header */}
      <View
        style={[
          styles.topHeader,
          { paddingHorizontal: horizontalPadding, paddingTop: Math.max(insets.top, 12) },
        ]}
      >
        <View style={styles.headerLeft}>
          {user?.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.initials}>{(user?.fullName || 'DR').slice(0, 2).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.flexText}>
            <Text style={styles.greeting}>{getTimeGreeting()}</Text>
            <Text style={[styles.driverName, { fontSize: scaleFont(17) }]}>{user?.fullName}</Text>
            <Text style={styles.vehicleSub}>{user?.vehicle?.registrationNumber || 'No Vehicle Assigned'}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.bellBtn}
          accessibilityLabel="Notifications"
          onPress={() => Alert.alert('Notifications', 'All fleet notifications are up to date.')}
        >
          <AppIcon name="bell" size={20} color={Theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Main Map Area */}
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          customMapStyle={CLEAN_MAP_STYLE}
          region={{ latitude: lat, longitude: lng, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
        >
          <Marker coordinate={{ latitude: lat, longitude: lng }} anchor={{ x: 0.5, y: 0.5 }}>
            <CustomVehicleMarker active={rideStarted} offline={!gps.internetConnected} />
          </Marker>
        </MapView>

        {/* Floating GPS & Connectivity Pills */}
        <View style={[styles.mapOverlayPills, { left: horizontalPadding, right: horizontalPadding }]}>
          <StatusPill
            icon="navigation"
            label={gps.gpsEnabled ? `GPS ${accuracyText}` : 'GPS unavailable'}
            tone={gps.gpsEnabled ? 'success' : 'error'}
          />
          <StatusPill
            icon={gps.internetConnected ? 'wifi' : 'wifi-off'}
            label={gps.internetConnected ? 'Online' : 'Offline'}
            tone={gps.internetConnected ? 'neutral' : 'error'}
          />
        </View>
      </View>

      {/* Bottom Floating Sheet */}
      <FloatingBottomSheet style={{ paddingHorizontal: horizontalPadding }}>
        <Animated.View style={[styles.sheetHeader, { transform: [{ scale: statusScale }] }]}>
          <View style={styles.flexText}>
            <Text style={styles.sheetEyebrow}>
              {rideStarted ? 'ACTIVE RIDE' : 'READY FOR DISPATCH'}
            </Text>
            <Text style={[styles.sheetTitle, { fontSize: scaleFont(18) }]}>
              {rideStarted ? 'Live GPS Sharing Active' : 'You are Available'}
            </Text>
          </View>
          <StatusPill
            icon={rideStarted ? 'check-circle' : 'clock'}
            label={rideStarted ? 'Active' : 'Idle'}
            tone={rideStarted ? 'success' : 'neutral'}
          />
        </Animated.View>

        {gps.statusMessage ? <Text style={styles.warnText}>{gps.statusMessage}</Text> : null}

        {gps.lastSyncedAt ? (
          <View style={styles.syncRow}>
            <AppIcon name="clock" size={14} color={Theme.colors.textSecondary} />
            <Text style={styles.syncText}>
              Last synced: {new Date(gps.lastSyncedAt).toLocaleTimeString()}
              {gps.queuedCount > 0 ? ` • ${gps.queuedCount} queued` : ''}
            </Text>
          </View>
        ) : null}

        {!rideStarted ? (
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={busy}
            onPress={handleStartRide}
            style={styles.primaryBlackBtn}
          >
            <Text style={styles.primaryBtnText}>{busy ? 'Starting Ride...' : 'START RIDE'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={busy}
            onPress={handleEndRide}
            style={styles.endRideBtn}
          >
            <Text style={styles.primaryBtnText}>{busy ? 'Ending Ride...' : 'END RIDE'}</Text>
          </TouchableOpacity>
        )}
      </FloatingBottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  topHeader: {
    backgroundColor: Theme.colors.secondary,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  flexText: { flex: 1, flexShrink: 1 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  greeting: { fontSize: 12, color: Theme.colors.textSecondary, fontWeight: '600' },
  driverName: { fontWeight: '800', color: Theme.colors.text, flexShrink: 1 },
  vehicleSub: { fontSize: 12, color: Theme.colors.textSecondary, marginTop: 1 },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: { flex: 1, minHeight: 220, position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },
  mapOverlayPills: {
    position: 'absolute',
    top: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sheetEyebrow: { fontSize: 11, fontWeight: '800', color: Theme.colors.textSecondary, letterSpacing: 0.8 },
  sheetTitle: { fontWeight: '800', color: Theme.colors.text, marginTop: 2 },
  warnText: { fontSize: 13, fontWeight: '700', color: Theme.colors.error, marginBottom: 8 },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  syncText: { fontSize: 12, color: Theme.colors.textSecondary, flexShrink: 1 },
  primaryBlackBtn: {
    width: '100%',
    minHeight: 54,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  endRideBtn: {
    width: '100%',
    minHeight: 54,
    backgroundColor: Theme.colors.error,
    borderRadius: Theme.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.4 },
});
