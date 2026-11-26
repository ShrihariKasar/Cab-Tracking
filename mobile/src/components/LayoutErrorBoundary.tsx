import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Theme } from '../config/theme';

interface State {
  hasError: boolean;
  message: string;
}

export class LayoutErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Unexpected UI rendering error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Layout / Rendering Error</Text>
          <Text style={styles.message}>{this.state.message}</Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, message: '' })}
            style={styles.btn}
          >
            <Text style={styles.btnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: { fontSize: 18, fontWeight: '800', color: Theme.colors.red, textAlign: 'center' },
  message: { fontSize: 14, color: Theme.colors.textMuted, marginTop: 8, textAlign: 'center' },
  btn: {
    marginTop: 16,
    minHeight: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
