import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Theme } from '../config/theme';

export const SkeletonCard: React.FC = () => {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View style={[styles.card, { opacity: pulse }]}>
      <View style={styles.avatar} />
      <View style={styles.lines}>
        <View style={[styles.line, { width: '60%' }]} />
        <View style={[styles.line, { width: '40%', height: 10 }]} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.card,
    padding: 16,
    gap: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E5E5E5' },
  lines: { flex: 1, gap: 8 },
  line: { height: 14, borderRadius: 6, backgroundColor: '#E5E5E5' },
});
