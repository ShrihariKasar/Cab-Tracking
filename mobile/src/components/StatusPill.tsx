import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Theme } from '../config/theme';
import { AppIcon, IconName } from './AppIcon';

interface StatusPillProps {
  label: string;
  tone?: 'success' | 'error' | 'warning' | 'neutral';
  icon?: IconName;
}

const TONE_MAP = {
  success: { bg: '#DCFCE7', fg: Theme.colors.success },
  error: { bg: '#FEE2E2', fg: Theme.colors.error },
  warning: { bg: '#FEF3C7', fg: '#B45309' },
  neutral: { bg: '#F0F0F0', fg: Theme.colors.text },
};

export const StatusPill: React.FC<StatusPillProps> = ({ label, tone = 'neutral', icon }) => {
  const palette = TONE_MAP[tone];
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      {icon ? <AppIcon name={icon} size={13} color={palette.fg} strokeWidth={2.2} /> : null}
      <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.radius.pill,
  },
  label: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
});
