import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { AppIcon } from '../../components/AppIcon';
import { CustomVehicleMarker } from '../../components/CustomVehicleMarker';
import { SkeletonCard } from '../../components/SkeletonCard';
import { StatusPill } from '../../components/StatusPill';
import { CLEAN_MAP_STYLE, getTimeGreeting, Theme } from '../../config/theme';
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
    const offline = drivers.filter((d) => d.availabilityStatus === 'OFFLINE').length;
    return { total, activeRides, offline };
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

  const mapDrivers = drivers.filter((d) => d.latitude && d.longitude);

  const listHeader = (
    <View style={styles.headerBlock}>
      {/* Top Fleet Header */}
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <AppIcon name="car" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.flexText}>
            <Text style={styles.greeting}>{getTimeGreeting()}</Text>
            <Text style={[styles.companyTitle, { fontSize: scaleFont(20) }]}>FleetPulse</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.iconCircle}
          onPress={() => Alert.alert('Fleet Alerts', 'Real-time ride alerts are active.')}
        >
          <AppIcon name="bell" size={18} color={Theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Live Fleet Map Preview */}
      <View style={[styles.mapPreviewCard, Theme.shadow.card]}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.mapPreview}
          customMapStyle={CLEAN_MAP_STYLE}
          initialRegion={{
            latitude: mapDrivers[0]?.latitude || 12.9716,
            longitude: mapDrivers[0]?.longitude || 77.5946,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          }}
        >
          {mapDrivers.map((d) => (
            <Marker
              key={d.id}
              coordinate={{ latitude: d.latitude!, longitude: d.longitude! }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <CustomVehicleMarker active={d.rideStatus === 'RIDE_STARTED'} offline={d.availabilityStatus === 'OFFLINE'} />
            </Marker>
          ))}
        </MapView>
        <View style={styles.mapTag}>
          <StatusPill icon="navigation" label="Live Fleet Preview" tone="neutral" />
        </View>
      </View>

      {/* 3 Stat Cards */}
      <View style={styles.statsRow}>
        <StatCard label="Active Rides" value={counts.activeRides} color={Theme.colors.success} />
        <StatCard label="Total Drivers" value={counts.total} color={Theme.colors.primary} />
        <StatCard label="Offline" value={counts.offline} color={Theme.colors.error} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBox, Theme.shadow.card]}>
        <AppIcon name="search" size={18} color={Theme.colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search driver or vehicle reg..."
          placeholderTextColor={Theme.colors.textSecondary}
          style={styles.searchInput}
        />
      </View>

      <Text style={styles.sectionTitle}>Fleet Drivers</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadDrivers} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { paddingHorizontal: horizontalPadding }]}>
      {loading ? (
        <View style={styles.skeletonWrap}>
          {listHeader}
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(d) => d.id}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadDrivers();
              }}
            />
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No drivers match your search.</Text>}
          renderItem={({ item }) => {
            const isOnline = item.availabilityStatus !== 'OFFLINE';
            const isRideStarted = item.rideStatus === 'RIDE_STARTED';
            return (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => onSelectDriver(item)}
                style={[styles.card, Theme.shadow.card, isSmallPhone && styles.cardColumn]}
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
                    <StatusPill
                      icon={isRideStarted ? 'navigation' : 'clock'}
                      label={isRideStarted ? 'Active Ride' : isOnline ? 'Available' : 'Offline'}
                      tone={isRideStarted ? 'success' : isOnline ? 'neutral' : 'error'}
                    />
                  </View>
                  <View style={styles.timeRow}>
                    <AppIcon name="clock" size={12} color={Theme.colors.textSecondary} />
                    <Text style={styles.time}>
                      {item.capturedAt ? new Date(item.capturedAt).toLocaleTimeString() : 'No GPS yet'}
                    </Text>
                  </View>
                </View>
                {!isSmallPhone ? <AppIcon name="chevron-right" size={18} color={Theme.colors.textSecondary} /> : null}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

const StatCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <View style={[styles.statCard, Theme.shadow.card]}>
    <Text style={[styles.statVal, { color }]}>{value}</Text>
    <Text style={styles.statLbl}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  skeletonWrap: { flex: 1 },
  headerBlock: { paddingTop: 12, gap: 12, marginBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  brandRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexText: { flex: 1, flexShrink: 1 },
  greeting: { fontSize: 12, color: Theme.colors.textSecondary, fontWeight: '600' },
  companyTitle: { fontWeight: '800', color: Theme.colors.text, letterSpacing: -0.4 },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPreviewCard: {
    width: '100%',
    height: 150,
    borderRadius: Theme.radius.card,
    overflow: 'hidden',
    backgroundColor: '#E5E5E5',
    position: 'relative',
  },
  mapPreview: { ...StyleSheet.absoluteFillObject },
  mapTag: { position: 'absolute', top: 10, left: 10 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: {
    flex: 1,
    minWidth: 92,
    backgroundColor: Theme.colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statVal: { fontSize: 20, fontWeight: '800' },
  statLbl: { fontSize: 11, color: Theme.colors.textSecondary, marginTop: 2, textAlign: 'center', fontWeight: '600' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: Theme.colors.text, paddingVertical: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Theme.colors.text, marginTop: 2 },
  listContent: { paddingBottom: 24, gap: 10, flexGrow: 1 },
  card: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.card,
    padding: 14,
    gap: 12,
    alignItems: 'center',
  },
  cardColumn: { flexDirection: 'column', alignItems: 'flex-start' },
  cardBody: { flex: 1, flexShrink: 1, width: '100%', gap: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  name: { fontWeight: '700', color: Theme.colors.text, flexShrink: 1 },
  meta: { fontSize: 13, color: Theme.colors.textSecondary, flexShrink: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  time: { fontSize: 12, color: Theme.colors.textSecondary },
  emptyText: { textAlign: 'center', color: Theme.colors.textSecondary, marginTop: 24, fontSize: 14 },
  errorBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    gap: 8,
  },
  errorText: { color: Theme.colors.error, fontWeight: '600', fontSize: 13 },
  retryBtn: {
    minHeight: 44,
    backgroundColor: Theme.colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
});
