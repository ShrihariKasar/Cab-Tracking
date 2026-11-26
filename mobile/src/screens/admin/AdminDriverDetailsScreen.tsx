import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { StatusPill } from '../../components/StatusPill';
import { Theme } from '../../config/theme';
import type { DriverListItem } from '../../types';
import { useResponsive } from '../../utils/responsive';

interface Props {
  driver: DriverListItem;
  onBack: () => void;
  onViewLiveLocation: (driverId: string) => void;
}

export const AdminDriverDetailsScreen: React.FC<Props> = ({ driver, onBack, onViewLiveLocation }) => {
  const { horizontalPadding, scaleFont } = useResponsive();
  const isRideStarted = driver.rideStatus === 'RIDE_STARTED';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
    >
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <AppIcon name="arrow-left" size={20} color={Theme.colors.text} />
        <Text style={styles.back}>Drivers</Text>
      </TouchableOpacity>

      <View style={[styles.heroCard, Theme.shadow.card]}>
        {driver.photoUrl ? (
          <Image source={{ uri: driver.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.initials}>{driver.fullName.slice(0, 2).toUpperCase()}</Text>
          </View>
        )}
        <Text style={[styles.name, { fontSize: scaleFont(22) }]}>{driver.fullName}</Text>
        <View style={styles.phoneRow}>
          <AppIcon name="phone" size={14} color={Theme.colors.textSecondary} />
          <Text style={styles.phone}>{driver.mobileNumber}</Text>
        </View>
        <StatusPill
          icon={isRideStarted ? 'navigation' : 'clock'}
          label={isRideStarted ? 'Active Ride' : 'Ride Not Started'}
          tone={isRideStarted ? 'success' : 'neutral'}
        />
      </View>

      <View style={[styles.card, Theme.shadow.card]}>
        <DetailRow label="Vehicle Registration" value={driver.vehicleRegistration || 'Unassigned'} />
        <View style={styles.divider} />
        <DetailRow label="Vehicle Model" value={driver.vehicleModel || '-'} />
        <View style={styles.divider} />
        <DetailRow
          label="Internet Status"
          value={driver.internetConnected ? 'Connected' : 'Disconnected'}
          valueColor={driver.internetConnected ? Theme.colors.success : Theme.colors.error}
        />
        <View style={styles.divider} />
        <DetailRow
          label="Last GPS Update"
          value={driver.capturedAt ? new Date(driver.capturedAt).toLocaleString() : 'No GPS data'}
        />
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onViewLiveLocation(driver.id)}
        style={styles.liveBtn}
      >
        <AppIcon name="location" size={18} color="#FFFFFF" />
        <Text style={styles.liveBtnText}>VIEW LIVE LOCATION</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const DetailRow: React.FC<{ label: string; value: string; valueColor?: string }> = ({
  label,
  value,
  valueColor = Theme.colors.text,
}) => (
  <View style={styles.row}>
    <Text style={styles.rowLbl}>{label}</Text>
    <Text style={[styles.rowVal, { color: valueColor }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  content: { paddingVertical: 14, gap: 14, flexGrow: 1 },
  backBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  back: { color: Theme.colors.text, fontWeight: '700', fontSize: 16 },
  heroCard: {
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.card,
    padding: 20,
    gap: 8,
  },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  name: { fontWeight: '800', color: Theme.colors.text, textAlign: 'center', marginTop: 4 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  phone: { fontSize: 14, color: Theme.colors.textSecondary },
  card: {
    width: '100%',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.card,
    padding: 16,
    gap: 10,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, paddingVertical: 2 },
  rowLbl: { fontSize: 13, color: Theme.colors.textSecondary, flexShrink: 1 },
  rowVal: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  divider: { height: 1, backgroundColor: Theme.colors.border },
  liveBtn: {
    width: '100%',
    minHeight: 54,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.button,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  liveBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15, letterSpacing: 0.4 },
});
