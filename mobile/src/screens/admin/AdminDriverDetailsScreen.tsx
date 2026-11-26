import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Theme } from '../../config/theme';
import type { DriverListItem } from '../../types';
import { useResponsive } from '../../utils/responsive';

interface Props {
  driver: DriverListItem;
  onBack: () => void;
  onViewLiveLocation: (driverId: string) => void;
}

export const AdminDriverDetailsScreen: React.FC<Props> = ({ driver, onBack, onViewLiveLocation }) => {
  const { horizontalPadding, isSmallPhone, scaleFont } = useResponsive();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
    >
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.back}>← Back to Drivers</Text>
      </TouchableOpacity>

      <View style={[styles.header, isSmallPhone && styles.wrapRow]}>
        {driver.photoUrl ? (
          <Image source={{ uri: driver.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.initials}>{driver.fullName.slice(0, 2).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.flexText}>
          <Text style={[styles.name, { fontSize: scaleFont(20) }]}>{driver.fullName}</Text>
          <Text style={styles.phone}>{driver.mobileNumber}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <DetailRow label="Vehicle Registration" value={driver.vehicleRegistration || 'Unassigned'} />
        <DetailRow label="Vehicle Model" value={driver.vehicleModel || '-'} />
        <DetailRow
          label="Current Ride Status"
          value={driver.rideStatus === 'RIDE_STARTED' ? 'Ride Started' : 'Ride Not Started'}
          valueColor={driver.rideStatus === 'RIDE_STARTED' ? Theme.colors.green : Theme.colors.text}
        />
        <DetailRow
          label="Internet Connection"
          value={driver.internetConnected ? 'Connected' : 'Disconnected'}
          valueColor={driver.internetConnected ? Theme.colors.green : Theme.colors.red}
        />
        <DetailRow
          label="Last Location Update"
          value={driver.capturedAt ? new Date(driver.capturedAt).toLocaleString() : 'No GPS data'}
        />
      </View>

      <TouchableOpacity onPress={() => onViewLiveLocation(driver.id)} style={styles.liveBtn}>
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
  content: { paddingVertical: 16, gap: 16, flexGrow: 1 },
  backBtn: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  back: { color: Theme.colors.primary, fontWeight: '700', fontSize: 15 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  wrapRow: { flexWrap: 'wrap' },
  flexText: { flex: 1, flexShrink: 1 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  name: { fontWeight: '800', color: Theme.colors.text, flexShrink: 1 },
  phone: { fontSize: 14, color: Theme.colors.textMuted, marginTop: 2, flexShrink: 1 },
  card: {
    width: '100%',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 16,
    gap: 12,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  rowLbl: { fontSize: 13, color: Theme.colors.textMuted, flexShrink: 1 },
  rowVal: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  liveBtn: {
    width: '100%',
    minHeight: 52,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.button,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16, textAlign: 'center' },
});
