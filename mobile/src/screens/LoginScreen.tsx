import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../utils/responsive';
import type { UserRole } from '../types';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const { horizontalPadding, scaleFont } = useResponsive();

  const [role, setRole] = useState<UserRole>('DRIVER');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    if (!mobileNumber.trim() || !password) {
      Alert.alert('Missing Credentials', 'Enter your mobile number and password.');
      return;
    }
    setBusy(true);
    try {
      await login(mobileNumber.trim(), password, role);
    } catch (err: any) {
      Alert.alert('Login Failed', err?.response?.data?.message || 'Invalid mobile number or password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPadding,
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
      >
        <View style={styles.inner}>
          <Text style={[styles.title, { fontSize: scaleFont(26) }]}>Cab Live Tracking</Text>
          <Text style={[styles.subtitle, { fontSize: scaleFont(14) }]}>Corporate Fleet Portal</Text>

          <View style={styles.roleSwitch}>
            {(['DRIVER', 'ADMIN'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRole(r)}
                style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              >
                <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                  {r === 'DRIVER' ? 'Driver' : 'Admin'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              value={mobileNumber}
              onChangeText={setMobileNumber}
              placeholder="+15550000002"
              placeholderTextColor={Theme.colors.textMuted}
              keyboardType="phone-pad"
              style={styles.input}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor={Theme.colors.textMuted}
              secureTextEntry
              style={styles.input}
            />

            <TouchableOpacity disabled={busy} onPress={handleLogin} style={styles.loginBtn}>
              <Text style={styles.loginBtnText}>{busy ? 'Signing in...' : `Sign In as ${role}`}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Theme.colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  inner: { width: '100%', maxWidth: 440 },
  title: { fontWeight: '800', color: Theme.colors.text, textAlign: 'center' },
  subtitle: { color: Theme.colors.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  roleSwitch: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 4,
    marginBottom: 16,
  },
  roleBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  roleBtnActive: { backgroundColor: Theme.colors.primary },
  roleText: { fontWeight: '700', color: Theme.colors.textMuted, textAlign: 'center' },
  roleTextActive: { color: '#FFFFFF' },
  card: {
    width: '100%',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.card,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 18,
    gap: 10,
  },
  label: { fontSize: 13, fontWeight: '700', color: Theme.colors.text },
  input: {
    width: '100%',
    minHeight: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Theme.colors.text,
  },
  loginBtn: {
    width: '100%',
    minHeight: 48,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.button,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15, textAlign: 'center' },
});
