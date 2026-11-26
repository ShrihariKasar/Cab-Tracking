import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { SkeletonCard } from '../../components/SkeletonCard';
import { StatusPill } from '../../components/StatusPill';
import { Theme } from '../../config/theme';
import { api } from '../../services/api';
import type { ActiveRideItem } from '../../types';
import { useResponsive } from '../../utils/responsive';

export const AdminActiveRidesScreen: React.FC<{ onOpenLiveMap: (driverId: string) => void }> = ({
  onOpenLiveMap,
}) => {
  const { horizontalPadding, scaleFont } = useResponsive();
  const [rides, setRides] = useState<ActiveRideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/rides/active');
      setRides(res.data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load active rides.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={[styles.container, { paddingHorizontal: horizontalPadding }]}>
      <Text style={[styles.title, { fontSize: scaleFont(22) }]}>Active Rides ({rides.length})</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <View>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(r) => r.rideId}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          ListEmptyComponent={<Text style={styles.empty}>No active rides right now.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onOpenLiveMap(item.driverId)}
              style={[styles.card, Theme.shadow.card]}
            >
              <View style={styles.rowBetween}>
                <Text style={styles.name}>{item.driverName}</Text>
                <StatusPill icon="navigation" label="LIVE" tone="success" />
              </View>
              <Text style={styles.meta}>
                {item.vehicleRegistration || 'Cab'} • {item.vehicleModel || ''}
              </Text>
              <View style={styles.footerRow}>
                <View style={styles.timeRow}>
                  <AppIcon name="clock" size={13} color={Theme.colors.textSecondary} />
                  <Text style={styles.started}>Started {new Date(item.startTime).toLocaleTimeString()}</Text>
                </View>
                <View style={styles.trackLink}>
                  <Text style={styles.tap}>Track Live</Text>
                  <AppIcon name="chevron-right" size={16} color={Theme.colors.primary} />
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background, paddingTop: 16 },
  title: { fontWeight: '800', color: Theme.colors.text, marginBottom: 14, letterSpacing: -0.3 },
  listContent: { paddingBottom: 24, flexGrow: 1, gap: 12 },
  empty: { color: Theme.colors.textSecondary, textAlign: 'center', marginTop: 40, fontSize: 14 },
  card: {
    width: '100%',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.card,
    padding: 16,
    gap: 8,
  },
  rowBetween: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '800', color: Theme.colors.text, flexShrink: 1 },
  meta: { fontSize: 13, color: Theme.colors.textSecondary, flexShrink: 1 },
  footerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, gap: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  started: { fontSize: 12, color: Theme.colors.textSecondary, fontWeight: '600' },
  trackLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  tap: { fontSize: 13, color: Theme.colors.primary, fontWeight: '800' },
  errorBox: { padding: 14, borderRadius: 12, backgroundColor: '#FEE2E2', marginBottom: 12, gap: 8 },
  errorText: { color: Theme.colors.error, fontWeight: '600', fontSize: 13 },
  retryBtn: { minHeight: 44, backgroundColor: Theme.colors.primary, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
});
