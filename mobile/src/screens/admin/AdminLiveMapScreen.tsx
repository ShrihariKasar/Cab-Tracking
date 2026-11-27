import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/AppIcon';
import { FloatingBottomSheet } from '../../components/FloatingBottomSheet';
import { LeafletMap } from '../../components/LeafletMap';
import { StatusPill } from '../../components/StatusPill';
import { Theme } from '../../config/theme';
import { api } from '../../services/api';
import { socketManager } from '../../services/socket';
import { useResponsive } from '../../utils/responsive';
import { fetchRoadRoute, type LatLngPoint } from '../../utils/routing';

interface DriverLocationPayload {
  driverId: string;
  driverName: string;
  vehicleRegistration?: string | null;
  vehicleModel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capturedAt?: string | null;
  lastSyncedAt?: string | null;
  internetConnected?: boolean;
  gpsEnabled?: boolean;
  rideStatus?: string | null;
  rideStartTime?: string | null;
  startLatitude?: number | null;
  startLongitude?: number | null;
  pickupAddress?: string | null;
  destinationAddress?: string | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
}

export const AdminLiveMapScreen: React.FC<{ driverId: string; onBack: () => void }> = ({
  driverId,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const { horizontalPadding, height, isSmallPhone, scaleFont } = useResponsive();
  const [info, setInfo] = useState<DriverLocationPayload | null>(null);
  const [routeCoords, setRouteCoords] = useState<LatLngPoint[]>([]);
  const [stale, setStale] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recenterSignal, setRecenterSignal] = useState(0);

  useEffect(() => {
    api
      .get(`/drivers/${driverId}/location`)
      .then((res) => {
        setLoadError(null);
        const d: DriverLocationPayload = res.data.data;
        setInfo(d);
      })
      .catch((err) => {
        setLoadError(err?.response?.data?.message || 'Unable to load driver location.');
      });

    let mounted = true;
    socketManager.connect().then((socket) => {
      if (!mounted || !socket) return;
      const onLoc = (ping: any) => {
        if (ping.driverId !== driverId) return;
        setStale(false);
        setInfo((prev) =>
          prev
            ? {
                ...prev,
                latitude: ping.latitude,
                longitude: ping.longitude,
                capturedAt: ping.capturedAt,
                lastSyncedAt: ping.lastSyncedAt,
                internetConnected: true,
              }
            : prev
        );
      };
      socket.on('admin:location:updated', onLoc);
      return () => socket.off('admin:location:updated', onLoc);
    });

    const staleTimer = setInterval(() => {
      setInfo((current) => {
        if (current?.capturedAt) {
          const ageMs = Date.now() - new Date(current.capturedAt).getTime();
          setStale(ageMs > 25000);
        }
        return current;
      });
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(staleTimer);
    };
  }, [driverId]);

  useEffect(() => {
    if (info?.latitude && info?.longitude && info?.destinationLatitude && info?.destinationLongitude) {
      let active = true;
      fetchRoadRoute(
        { latitude: info.latitude, longitude: info.longitude },
        { latitude: info.destinationLatitude, longitude: info.destinationLongitude }
      ).then((pts) => {
        if (active) setRouteCoords(pts);
      });
      return () => {
        active = false;
      };
    }
    setRouteCoords([]);
  }, [info?.destinationLatitude, info?.destinationLongitude, Boolean(info?.latitude && info?.longitude)]);

  const recenter = () => {
    setRecenterSignal((s) => s + 1);
  };

  const isOfflineOrStale = stale || info?.internetConnected === false;

  return (
    <View style={styles.container}>
      <LeafletMap
        vehicleCoord={{
          latitude: info?.latitude || 12.9716,
          longitude: info?.longitude || 77.5946,
        }}
        startCoord={
          info?.startLatitude && info?.startLongitude
            ? { latitude: info.startLatitude, longitude: info.startLongitude }
            : null
        }
        destCoord={
          info?.destinationLatitude && info?.destinationLongitude
            ? { latitude: info.destinationLatitude, longitude: info.destinationLongitude }
            : null
        }
        routeCoords={routeCoords}
        active={!isOfflineOrStale}
        offline={isOfflineOrStale}
        recenterSignal={recenterSignal}
      />

      {/* Top Floating Panel */}
      <View
        style={[
          styles.topBar,
          { top: Math.max(insets.top, 12), paddingHorizontal: horizontalPadding },
        ]}
      >
        <TouchableOpacity onPress={onBack} style={[styles.mapIconBtn, Theme.shadow.floating]} accessibilityLabel="Back">
          <AppIcon name="arrow-left" size={20} color={Theme.colors.text} />
        </TouchableOpacity>

        <View style={[styles.topPillCard, Theme.shadow.floating]}>
          <View style={styles.flexText}>
            <Text style={styles.topDriverName}>
              {info?.driverName || 'Loading...'}
            </Text>
            <Text style={styles.topVehicle}>{info?.vehicleRegistration || 'Cab'}</Text>
          </View>
          <StatusPill
            label={isOfflineOrStale ? 'Offline' : 'LIVE'}
            tone={isOfflineOrStale ? 'error' : 'success'}
          />
        </View>

        <TouchableOpacity onPress={recenter} style={[styles.mapIconBtn, Theme.shadow.floating]} accessibilityLabel="Recenter">
          <AppIcon name="crosshair" size={20} color={Theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Bottom Floating Sheet */}
      <FloatingBottomSheet
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: Math.max(insets.bottom, 18),
          paddingHorizontal: horizontalPadding,
          maxHeight: Math.round(height * 0.44),
        }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {loadError ? <Text style={styles.staleWarn}>{loadError}</Text> : null}

          <View style={styles.driverRow}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.initials}>{(info?.driverName || 'DR').slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.flexText}>
              <Text style={[styles.sheetName, { fontSize: scaleFont(18) }]}>{info?.driverName || 'Driver'}</Text>
              <Text style={styles.sheetVehicle}>
                {info?.vehicleRegistration || '-'} {info?.vehicleModel ? `• ${info.vehicleModel}` : ''}
              </Text>
            </View>
            <StatusPill
              icon={isOfflineOrStale ? 'alert' : 'navigation'}
              label={isOfflineOrStale ? 'Last known location' : 'Live GPS'}
              tone={isOfflineOrStale ? 'error' : 'success'}
            />
          </View>

          <View style={styles.divider} />

          {info?.pickupAddress || info?.destinationAddress ? (
            <Text style={styles.routeText}>
              {(info.pickupAddress || 'Current GPS') +
                (info.destinationAddress ? ` → ${info.destinationAddress}` : '')}
            </Text>
          ) : null}

          <View style={styles.metaGrid}>
            <MetaItem
              icon="clock"
              label="Last GPS"
              value={info?.capturedAt ? new Date(info.capturedAt).toLocaleTimeString() : 'Unavailable'}
              fullWidth={isSmallPhone}
            />
            <MetaItem
              icon="navigation"
              label="Ride Started"
              value={info?.rideStartTime ? new Date(info.rideStartTime).toLocaleTimeString() : 'Active'}
              fullWidth={isSmallPhone}
            />
            <MetaItem
              icon={info?.internetConnected === false ? 'wifi-off' : 'wifi'}
              label="Internet"
              value={info?.internetConnected === false ? 'Offline' : 'Connected'}
              fullWidth={isSmallPhone}
            />
            <MetaItem
              icon="location"
              label="GPS Signal"
              value={info?.gpsEnabled === false ? 'Unavailable' : 'Active'}
              fullWidth={isSmallPhone}
            />
          </View>

          {isOfflineOrStale ? (
            <Text style={styles.staleWarn}>
              Location not updating — showing last known position
            </Text>
          ) : null}
        </ScrollView>
      </FloatingBottomSheet>
    </View>
  );
};

const MetaItem: React.FC<{ icon: any; label: string; value: string; fullWidth?: boolean }> = ({
  icon,
  label,
  value,
  fullWidth,
}) => (
  <View style={[styles.metaItem, fullWidth && styles.metaItemFull]}>
    <AppIcon name={icon} size={14} color={Theme.colors.textSecondary} />
    <View style={styles.flexText}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaVal}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapIconBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topPillCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  flexText: { flex: 1, flexShrink: 1 },
  topDriverName: { fontSize: 13, fontWeight: '800', color: Theme.colors.text },
  topVehicle: { fontSize: 11, color: Theme.colors.textSecondary },
  driverRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  sheetName: { fontWeight: '800', color: Theme.colors.text },
  sheetVehicle: { fontSize: 13, color: Theme.colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: Theme.colors.border, marginVertical: 12 },
  routeText: { fontSize: 13, fontWeight: '700', color: Theme.colors.text, marginBottom: 10 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { minWidth: '46%', flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaItemFull: { minWidth: '100%' },
  metaLabel: { fontSize: 11, color: Theme.colors.textSecondary },
  metaVal: { fontSize: 13, fontWeight: '700', color: Theme.colors.text },
  staleWarn: { fontSize: 12, fontWeight: '700', color: Theme.colors.error, marginTop: 10 },
});
