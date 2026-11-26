import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
      <Text style={[styles.title, { fontSize: scaleFont(20) }]}>Active Rides ({rides.length})</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
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
            <TouchableOpacity onPress={() => onOpenLiveMap(item.driverId)} style={styles.card}>
              <Text style={styles.name}>{item.driverName}</Text>
              <Text style={styles.meta}>
                {item.vehicleRegistration || 'Cab'} • {item.vehicleModel || ''}
              </Text>
              <Text style={styles.started}>Started: {new Date(item.startTime).toLocaleTimeString()}</Text>
              <Text style={styles.tap}>Tap to view live location →</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background, paddingTop: 14 },
  title: { fontWeight: '800', color: Theme.colors.text, marginBottom: 12 },
  listContent: { paddingBottom: 24, flexGrow: 1 },
  empty: { color: Theme.colors.textMuted, textAlign: 'center', marginTop: 40, fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    width: '100%',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 16,
    marginBottom: 12,
    gap: 4,
  },
  name: { fontSize: 16, fontWeight: '700', color: Theme.colors.text, flexShrink: 1 },
  meta: { fontSize: 13, color: Theme.colors.textMuted, flexShrink: 1 },
  started: { fontSize: 12, color: Theme.colors.green, fontWeight: '700' },
  tap: { fontSize: 13, color: Theme.colors.primary, fontWeight: '700', marginTop: 4 },
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
