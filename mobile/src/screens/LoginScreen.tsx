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
import { AppIcon } from '../components/AppIcon';
import { Theme } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';
import { useResponsive } from '../utils/responsive';

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
            paddingTop: Math.max(insets.top, 24),
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
      >
        <View style={styles.inner}>
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <AppIcon name="car" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.brandName}>FleetPulse</Text>
          </View>

          <Text style={[styles.title, { fontSize: scaleFont(28) }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { fontSize: scaleFont(14) }]}>
            Sign in to continue to your fleet workspace
          </Text>

          <View style={styles.roleSwitch}>
            {(['DRIVER', 'ADMIN'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                activeOpacity={0.85}
                onPress={() => setRole(r)}
                style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              >
                <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                  {r === 'DRIVER' ? 'Driver' : 'Admin'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.card, Theme.shadow.card]}>
            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              value={mobileNumber}
              onChangeText={setMobileNumber}
              placeholder="+1 555 000 0002"
              placeholderTextColor={Theme.colors.textSecondary}
              keyboardType="phone-pad"
              style={styles.input}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor={Theme.colors.textSecondary}
              secureTextEntry
              style={styles.input}
            />

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={busy}
              onPress={handleLogin}
              style={[styles.loginBtn, busy && styles.loginBtnDisabled]}
            >
              <Text style={styles.loginBtnText}>
                {busy ? 'Signing in...' : `Continue as ${role === 'DRIVER' ? 'Driver' : 'Admin'}`}
              </Text>
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
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  logoMark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontSize: 18, fontWeight: '800', color: Theme.colors.text, letterSpacing: -0.3 },
  title: { fontWeight: '800', color: Theme.colors.text, letterSpacing: -0.5 },
  subtitle: { color: Theme.colors.textSecondary, marginTop: 4, marginBottom: 22 },
  roleSwitch: {
    flexDirection: 'row',
    backgroundColor: '#EAEAEA',
    borderRadius: 12,
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
  roleText: { fontWeight: '700', color: Theme.colors.textSecondary, textAlign: 'center' },
  roleTextActive: { color: Theme.colors.secondary },
  card: {
    width: '100%',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.card,
    padding: 20,
    gap: 10,
  },
  label: { fontSize: 13, fontWeight: '700', color: Theme.colors.text },
  input: {
    width: '100%',
    minHeight: 48,
    backgroundColor: Theme.colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Theme.colors.text,
  },
  loginBtn: {
    width: '100%',
    minHeight: 52,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.button,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginBtnDisabled: { opacity: 0.65 },
  loginBtnText: { color: Theme.colors.secondary, fontWeight: '700', fontSize: 15, textAlign: 'center' },
});
