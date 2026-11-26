import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Theme } from '../../config/theme';
import { api } from '../../services/api';
import { socketManager } from '../../services/socket';
import type { DriverListItem } from '../../types';
import { useResponsive } from '../../utils/responsive';

interface Props {
  onSelectDriver: (driver: DriverListItem) => void;
}

export const AdminDriversScreen: React.FC<Props> = ({ onSelectDriver }) => {
  const { horizontalPadding, isSmallPhone, scaleFont } = useResponsive();
  const [drivers, setDrivers] = useState<DriverListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadDrivers = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/drivers');
      setDrivers(res.data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load drivers.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDrivers();
    let mounted = true;
    socketManager.connect().then((socket) => {
      if (!mounted || !socket) return;
      const onStarted = (p: any) => {
        Alert.alert(
          'Ride Started',
          `${p.driverName} (${p.vehicleRegistration})\nStart: ${new Date(p.startTime).toLocaleTimeString()}`
        );
        loadDrivers();
      };
      const onEnded = (p: any) => {
        Alert.alert('Ride Ended', `${p.driverName} (${p.vehicleRegistration}) completed the ride.`);
        loadDrivers();
      };
      const onLoc = () => loadDrivers();

      socket.on('driver:ride:started', onStarted);
      socket.on('driver:ride:ended', onEnded);
      socket.on('admin:location:updated', onLoc);
      return () => {
        socket.off('driver:ride:started', onStarted);
        socket.off('driver:ride:ended', onEnded);
        socket.off('admin:location:updated', onLoc);
      };
    });
    return () => {
      mounted = false;
    };
  }, [loadDrivers]);

  const counts = useMemo(() => {
    const total = drivers.length;
    const activeRides = drivers.filter((d) => d.rideStatus === 'RIDE_STARTED').length;
    const available = drivers.filter((d) => d.availabilityStatus === 'AVAILABLE').length;
    const offline = drivers.filter((d) => d.availabilityStatus === 'OFFLINE').length;
    return { total, activeRides, available, offline };
  }, [drivers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter(
      (d) =>
        d.fullName.toLowerCase().includes(q) ||
        (d.vehicleRegistration || '').toLowerCase().includes(q)
    );
  }, [drivers, search]);

  return (
    <View style={[styles.container, { paddingHorizontal: horizontalPadding }]}>
      <View style={styles.kpiGrid}>
        <KpiBox label="Total Drivers" value={counts.total} color={Theme.colors.primary} compact={isSmallPhone} />
        <KpiBox label="Active Rides" value={counts.activeRides} color={Theme.colors.green} compact={isSmallPhone} />
        <KpiBox label="Available" value={counts.available} color={Theme.colors.primary} compact={isSmallPhone} />
        <KpiBox label="Offline" value={counts.offline} color={Theme.colors.red} compact={isSmallPhone} />
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search by driver name or vehicle reg..."
        placeholderTextColor={Theme.colors.textMuted}
        style={styles.search}
      />

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadDrivers} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadDrivers();
              }}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No drivers match your search.</Text>
          }
          renderItem={({ item }) => {
            const isOnline = item.availabilityStatus !== 'OFFLINE';
            const isRideStarted = item.rideStatus === 'RIDE_STARTED';
            return (
              <TouchableOpacity
                onPress={() => onSelectDriver(item)}
                style={[styles.card, isSmallPhone && styles.cardColumn]}
              >
                {item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.initials}>{item.fullName.slice(0, 2).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.cardBody}>
                  <Text style={[styles.name, { fontSize: scaleFont(16) }]}>{item.fullName}</Text>
                  <Text style={styles.meta}>
                    {item.vehicleRegistration || 'No Vehicle'} • {item.vehicleModel || '-'}
                  </Text>
                  <View style={styles.badges}>
                    <Text style={[styles.badge, { color: isOnline ? Theme.colors.green : Theme.colors.red }]}>
                      {isOnline ? 'Online' : 'Offline'}
                    </Text>
                    <Text style={[styles.badge, { color: isRideStarted ? Theme.colors.green : Theme.colors.textMuted }]}>
                      {isRideStarted ? 'Ride Started' : 'Ride Not Started'}
                    </Text>
                  </View>
                  <Text style={styles.time}>
                    Last update: {item.capturedAt ? new Date(item.capturedAt).toLocaleTimeString() : 'Never'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

const KpiBox: React.FC<{ label: string; value: number; color: string; compact: boolean }> = ({
  label,
  value,
  color,
  compact,
}) => (
  <View style={[styles.kpiBox, compact && styles.kpiBoxHalf]}>
    <Text style={[styles.kpiVal, { color }]}>{value}</Text>
    <Text style={styles.kpiLbl}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background, paddingTop: 12 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  kpiBox: {
    flex: 1,
    minWidth: 74,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  kpiBoxHalf: { minWidth: '47%' },
  kpiVal: { fontSize: 20, fontWeight: '800' },
  kpiLbl: { fontSize: 12, color: Theme.colors.textMuted, marginTop: 2, textAlign: 'center' },
  search: {
    width: '100%',
    minHeight: 48,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Theme.colors.text,
    marginBottom: 12,
  },
  listContent: { paddingBottom: 24, gap: 12, flexGrow: 1 },
  card: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
  },
  cardColumn: { flexDirection: 'column', alignItems: 'flex-start' },
  cardBody: { flex: 1, flexShrink: 1, width: '100%' },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#FFFFFF', fontWeight: '800' },
  name: { fontWeight: '700', color: Theme.colors.text, flexShrink: 1 },
  meta: { fontSize: 13, color: Theme.colors.textMuted, marginTop: 2, flexShrink: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  badge: { fontSize: 12, fontWeight: '700' },
  time: { fontSize: 12, color: Theme.colors.textMuted, marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', color: Theme.colors.textMuted, marginTop: 32, fontSize: 14 },
  errorBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.red,
    marginBottom: 12,
    gap: 8,
  },
  errorText: { color: Theme.colors.red, fontWeight: '600', fontSize: 13 },
  retryBtn: {
    minHeight: 44,
    backgroundColor: Theme.colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
});
