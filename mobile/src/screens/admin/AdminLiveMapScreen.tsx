import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { AnimatedRegion, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Theme } from '../../config/theme';
import { api } from '../../services/api';
import { socketManager } from '../../services/socket';
import { useResponsive } from '../../utils/responsive';

interface DriverLocationPayload {
  driverId: string;
  driverName: string;
  vehicleRegistration?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capturedAt?: string | null;
  lastSyncedAt?: string | null;
  internetConnected?: boolean;
  gpsEnabled?: boolean;
  rideStatus?: string | null;
}

export const AdminLiveMapScreen: React.FC<{ driverId: string; onBack: () => void }> = ({
  driverId,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const { horizontalPadding, height } = useResponsive();
  const [info, setInfo] = useState<DriverLocationPayload | null>(null);
  const [stale, setStale] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const mapRef = useRef<MapView | null>(null);

  const animatedCoord = useRef(
    new AnimatedRegion({
      latitude: 12.9716,
      longitude: 77.5946,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    })
  ).current;

  const moveMarker = useCallback(
    (lat: number, lng: number) => {
      animatedCoord
        .timing({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
          duration: 1000,
          useNativeDriver: false,
        } as any)
        .start();
    },
    [animatedCoord]
  );

  useEffect(() => {
    api
      .get(`/drivers/${driverId}/location`)
      .then((res) => {
        setLoadError(null);
        const d: DriverLocationPayload = res.data.data;
        setInfo(d);
        if (d.latitude && d.longitude) {
          moveMarker(d.latitude, d.longitude);
          mapRef.current?.animateToRegion({
            latitude: d.latitude,
            longitude: d.longitude,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          });
        }
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
        moveMarker(ping.latitude, ping.longitude);
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
  }, [driverId, moveMarker]);

  const recenter = () => {
    if (info?.latitude && info?.longitude) {
      mapRef.current?.animateToRegion({
        latitude: info.latitude,
        longitude: info.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      });
    }
  };

  const isOfflineOrStale = stale || info?.internetConnected === false;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: info?.latitude || 12.9716,
          longitude: info?.longitude || 77.5946,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        {info?.latitude && info?.longitude ? (
          <Marker.Animated coordinate={animatedCoord as any} anchor={{ x: 0.5, y: 0.5 }}>
            <View
              style={[
                styles.carMarker,
                { backgroundColor: isOfflineOrStale ? Theme.colors.red : Theme.colors.primary },
              ]}
            >
              <Icon name="car" size={22} color="#FFFFFF" />
            </View>
          </Marker.Animated>
        ) : null}
      </MapView>

      {/* Top safe-area controls: Back on left, Recenter on right so neither overlaps the bottom sheet */}
      <View style={[styles.topBar, { top: Math.max(insets.top, 12), paddingHorizontal: horizontalPadding }]}>
        <TouchableOpacity onPress={onBack} style={styles.mapIconBtn} accessibilityLabel="Back">
          <Icon name="arrow-left" size={22} color={Theme.colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={recenter} style={styles.mapIconBtn} accessibilityLabel="Recenter map">
          <Icon name="crosshairs-gps" size={22} color={Theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.bottomCard,
          {
            bottom: Math.max(insets.bottom, 12),
            left: horizontalPadding,
            right: horizontalPadding,
            maxHeight: Math.round(height * 0.42),
          },
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {loadError ? <Text style={styles.staleWarn}>{loadError}</Text> : null}
          <View style={styles.rowBetween}>
            <Text style={styles.driverName}>{info?.driverName || 'Loading...'}</Text>
            <Text style={[styles.badge, { color: isOfflineOrStale ? Theme.colors.red : Theme.colors.green }]}>
              {isOfflineOrStale ? 'Last known location' : 'LIVE'}
            </Text>
          </View>
          <Text style={styles.meta}>Vehicle: {info?.vehicleRegistration || '-'}</Text>
          <Text style={styles.meta}>
            Last captured: {info?.capturedAt ? new Date(info.capturedAt).toLocaleString() : 'Unavailable'}
          </Text>
          <Text style={styles.meta}>
            GPS: {info?.gpsEnabled === false ? 'Unavailable' : 'Active'} • Internet:{' '}
            {info?.internetConnected === false ? 'Offline' : 'Connected'}
          </Text>
          {isOfflineOrStale ? (
            <Text style={styles.staleWarn}>Location not updating — showing last known position</Text>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  carMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  bottomCard: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  driverName: { fontSize: 17, fontWeight: '800', color: Theme.colors.text, flexShrink: 1 },
  badge: { fontSize: 12, fontWeight: '800' },
  meta: { fontSize: 13, color: Theme.colors.textMuted, marginTop: 2, flexShrink: 1 },
  staleWarn: { fontSize: 12, fontWeight: '700', color: Theme.colors.red, marginTop: 6 },
});
