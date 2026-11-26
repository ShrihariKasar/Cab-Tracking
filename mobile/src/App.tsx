import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LayoutErrorBoundary } from './components/LayoutErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { AppNavigator } from './navigation/AppNavigator';

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <LayoutErrorBoundary>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </LayoutErrorBoundary>
    </SafeAreaProvider>
  );
}
