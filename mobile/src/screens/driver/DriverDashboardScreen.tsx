import React, { useEffect, useState } from 'react';
import { Alert, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Theme } from '../../config/theme';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { gpsService, type GpsStatusSnapshot } from '../../services/gpsService';
import { useResponsive } from '../../utils/responsive';

export const DriverDashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const { horizontalPadding, isSmallPhone, scaleFont } = useResponsive();
  const [gps, setGps] = useState<GpsStatusSnapshot>(gpsService.getSnapshot());
  const [rideStarted, setRideStarted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = gpsService.subscribe(setGps);
    gpsService.checkAndRequestPermissions();
    gpsService.checkConnectivity();
    return unsub;
  }, []);

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
          } catch (err: any) {
            Alert.alert('End Ride Error', err?.response?.data?.message || 'Unable to end ride.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
    >
      <View style={styles.card}>
        <View style={[styles.profileRow, isSmallPhone && styles.profileRowSmall]}>
          {user?.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.initials}>{(user?.fullName || 'DR').slice(0, 2).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.flexText}>
            <Text style={[styles.name, { fontSize: scaleFont(18) }]}>{user?.fullName}</Text>
            <Text style={[styles.vehicle, { fontSize: scaleFont(14) }]}>
              {user?.vehicle?.registrationNumber || 'No Vehicle Assigned'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={[styles.cardTitle, { fontSize: scaleFont(15) }]}>Live Status Checks</Text>
        <StatusRow label="Location Permission" ok={gps.permissionGranted} okText="Granted" failText="Not Granted" />
        <StatusRow label="Device GPS" ok={gps.gpsEnabled} okText="ON" failText="GPS unavailable" />
        <StatusRow
          label="Internet Connection"
          ok={gps.internetConnected}
          okText="Connected"
          failText="Disconnected"
        />
        <StatusRow
          label="GPS Tracking"
          ok={gps.trackingActive}
          okText="Active (Background Ready)"
          failText="Idle"
        />
        {gps.statusMessage ? <Text style={styles.warningText}>{gps.statusMessage}</Text> : null}
        {gps.lastSyncedAt ? (
          <Text style={styles.syncText}>
            Last synced: {new Date(gps.lastSyncedAt).toLocaleTimeString()}
            {gps.queuedCount > 0 ? ` (${gps.queuedCount} queued)` : ''}
          </Text>
        ) : null}
      </View>

      {!rideStarted ? (
        <TouchableOpacity disabled={busy} onPress={handleStartRide} style={styles.startBtn}>
          <Text style={styles.btnText}>{busy ? 'Starting...' : 'START RIDE'}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.activeGroup}>
          <View style={styles.startedBanner}>
            <Text style={styles.startedText}>RIDE STARTED — Live GPS Sharing Active</Text>
          </View>
          <TouchableOpacity disabled={busy} onPress={handleEndRide} style={styles.endBtn}>
            <Text style={styles.btnText}>{busy ? 'Ending...' : 'END RIDE'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const StatusRow: React.FC<{ label: string; ok: boolean; okText: string; failText: string }> = ({
  label,
  ok,
  okText,
  failText,
}) => (
  <View style={styles.statusRow}>
    <Text style={styles.statusLabel}>{label}</Text>
    <Text style={[styles.statusVal, { color: ok ? Theme.colors.green : Theme.colors.red }]}>
      {ok ? okText : failText}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { paddingVertical: 16, gap: 14, flexGrow: 1 },
  card: {
    width: '100%',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 16,
    gap: 10,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileRowSmall: { flexWrap: 'wrap' },
  flexText: { flex: 1, flexShrink: 1 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#FFFFFF', fontWeight: '800', fontSize: 18 },
  name: { fontWeight: '800', color: Theme.colors.text, flexShrink: 1 },
  vehicle: { color: Theme.colors.textMuted, marginTop: 2, flexShrink: 1 },
  cardTitle: { fontWeight: '700', color: Theme.colors.text },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  statusLabel: { fontSize: 14, color: Theme.colors.textMuted, flexShrink: 1 },
  statusVal: { fontSize: 14, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  warningText: { color: Theme.colors.red, fontWeight: '700', fontSize: 13, marginTop: 4 },
  syncText: { color: Theme.colors.textMuted, fontSize: 12 },
  activeGroup: { width: '100%', gap: 12 },
  startBtn: {
    width: '100%',
    minHeight: 54,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.button,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startedBanner: {
    width: '100%',
    minHeight: 48,
    backgroundColor: Theme.colors.green,
    borderRadius: Theme.radius.button,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startedText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15, textAlign: 'center' },
  endBtn: {
    width: '100%',
    minHeight: 52,
    backgroundColor: Theme.colors.red,
    borderRadius: Theme.radius.button,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16, textAlign: 'center' },
});
