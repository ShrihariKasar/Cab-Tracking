import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Theme } from '../config/theme';
import { AppIcon } from './AppIcon';

export const CustomVehicleMarker: React.FC<{ active?: boolean; offline?: boolean }> = ({
  active = true,
  offline = false,
}) => {
  const bg = offline ? Theme.colors.error : active ? Theme.colors.primary : '#404040';
  return (
    <View style={styles.outerRing}>
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <AppIcon name="car" size={18} color="#FFFFFF" strokeWidth={2.2} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerRing: {
    padding: 4,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
});
