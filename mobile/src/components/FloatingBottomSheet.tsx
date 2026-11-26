import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../config/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const FloatingBottomSheet: React.FC<Props> = ({ children, style }) => {
  const slideAnim = useRef(new Animated.Value(36)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 140 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.sheet,
        Theme.shadow.floating,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
        style,
      ]}
    >
      <Animated.View style={styles.handle} />
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Theme.colors.secondary,
    borderTopLeftRadius: Theme.radius.sheet,
    borderTopRightRadius: Theme.radius.sheet,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D4D4D4',
    marginBottom: 12,
  },
});
