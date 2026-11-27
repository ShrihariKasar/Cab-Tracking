import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { ENV } from '../config/env';
import { Theme } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { getServerUrl, saveServerUrl } from '../services/secureStorage';
import type { UserRole } from '../types';
import { useResponsive } from '../utils/responsive';

function isDobUnder18(dob: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob.trim());
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const now = new Date();
  let age = now.getUTCFullYear() - y;
  const md = now.getUTCMonth() - (mo - 1);
  if (md < 0 || (md === 0 && now.getUTCDate() < d)) age--;
  return age < 18;
}

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const { horizontalPadding, scaleFont } = useResponsive();

  const [role, setRole] = useState<UserRole>('DRIVER');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'VERIFY_PARENTAL'>('LOGIN');
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [parentName, setParentName] = useState('');
  const [parentContact, setParentContact] = useState('');
  const [consentRecordId, setConsentRecordId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !mobileNumber.trim() || !password || !dateOfBirth.trim()) {
      Alert.alert('Missing Details', 'Enter full name, mobile number, password, and date of birth (YYYY-MM-DD).');
      return;
    }
    if (!acceptedTerms) {
      Alert.alert('Terms Required', 'Please check the box to accept the Terms & Conditions and Privacy Policy.');
      return;
    }
    setBusy(true);
    try {
      await saveServerUrl(serverUrl);
      const res = await api.post('/auth/register', {
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        password,
        dateOfBirth: dateOfBirth.trim(),
        acceptedTerms: true,
        parentName: parentName.trim() || undefined,
        parentContact: parentContact.trim() || undefined,
      });
      const data = res.data?.data;
      if (data?.requiresParentalConsent) {
        setConsentRecordId(data.consentRecordId);
        setMode('VERIFY_PARENTAL');
        Alert.alert(
          'Parental Consent Required',
          `Reference ${data.verificationReference}: Enter the 6-digit verification code sent to the parent/guardian.`
        );
      } else {
        await login(mobileNumber.trim(), password, 'DRIVER');
      }
    } catch (err: any) {
      Alert.alert('Registration Failed', err?.response?.data?.message || 'Unable to register.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyParental = async () => {
    if (!consentRecordId || !verificationCode.trim()) {
      Alert.alert('Missing Code', 'Enter the 6-digit parental verification code.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/compliance/parental-consent/verify', {
        consentRecordId,
        verificationCode: verificationCode.trim(),
      });
      Alert.alert('Consent Verified', 'Parental consent verified. You can now sign in.');
      setMode('LOGIN');
      setVerificationCode('');
    } catch (err: any) {
      Alert.alert('Verification Failed', err?.response?.data?.message || 'Invalid verification code.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    getServerUrl().then((saved) => {
      if (saved) setServerUrl(saved);
    });
  }, []);

  const handleLogin = async () => {
    if (!mobileNumber.trim() || !password) {
      Alert.alert('Missing Credentials', 'Enter your mobile number and password.');
      return;
    }
    setBusy(true);
    try {
      await saveServerUrl(serverUrl);
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
            <Image
              source={require('../assets/playstore-icon-512.png')}
              style={styles.logoMark}
              accessibilityLabel="FleetPulse Logo"
            />
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
                onPress={() => {
                  setRole(r);
                  if (r === 'ADMIN') setMode('LOGIN');
                }}
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
              textContentType="telephoneNumber"
              style={styles.input}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor={Theme.colors.textSecondary}
              secureTextEntry
              textContentType="password"
              style={styles.input}
            />

            {role === 'ADMIN' || mode === 'LOGIN' ? (
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
            ) : mode === 'REGISTER' ? (
              <>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Driver full name"
                  placeholderTextColor={Theme.colors.textSecondary}
                  style={styles.input}
                />
                <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
                <TextInput
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="1998-05-20"
                  placeholderTextColor={Theme.colors.textSecondary}
                  style={styles.input}
                />
                {isDobUnder18(dateOfBirth) ? (
                  <>
                    <Text style={styles.label}>Parent / Guardian Full Name</Text>
                    <TextInput
                      value={parentName}
                      onChangeText={setParentName}
                      placeholder="Parent / Guardian name"
                      placeholderTextColor={Theme.colors.textSecondary}
                      style={styles.input}
                    />
                    <Text style={styles.label}>Parent / Guardian Contact</Text>
                    <TextInput
                      value={parentContact}
                      onChangeText={setParentContact}
                      placeholder="Parent email or mobile"
                      placeholderTextColor={Theme.colors.textSecondary}
                      style={styles.input}
                    />
                  </>
                ) : null}
                <TouchableOpacity
                  onPress={() => setAcceptedTerms((v) => !v)}
                  style={styles.checkboxRow}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: acceptedTerms }}
                >
                  <View style={[styles.checkboxBox, acceptedTerms && styles.checkboxBoxChecked]}>
                    {acceptedTerms ? <Text style={styles.checkboxTick}>✓</Text> : null}
                  </View>
                  <Text style={styles.checkboxText}>
                    I agree to the Terms &amp; Conditions and Privacy Policy
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={busy || !acceptedTerms}
                  onPress={handleRegister}
                  style={[styles.loginBtn, (busy || !acceptedTerms) && styles.loginBtnDisabled]}
                >
                  <Text style={styles.loginBtnText}>{busy ? 'Registering...' : 'Create Driver Account'}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>Parental Verification Code</Text>
                <TextInput
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  placeholder="6-digit code"
                  placeholderTextColor={Theme.colors.textSecondary}
                  keyboardType="number-pad"
                  style={styles.input}
                />
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={busy}
                  onPress={handleVerifyParental}
                  style={[styles.loginBtn, busy && styles.loginBtnDisabled]}
                >
                  <Text style={styles.loginBtnText}>{busy ? 'Verifying...' : 'Verify Parental Consent'}</Text>
                </TouchableOpacity>
              </>
            )}

            {role === 'DRIVER' ? (
              <TouchableOpacity
                onPress={() => setMode((m) => (m === 'LOGIN' ? 'REGISTER' : 'LOGIN'))}
                style={styles.serverToggle}
              >
                <Text style={styles.serverToggleText}>
                  {mode === 'LOGIN' ? 'New Register' : 'Back to Sign In'}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              onPress={() => setShowServerConfig((v) => !v)}
              style={styles.serverToggle}
            >
              <AppIcon name="settings" size={14} color={Theme.colors.textSecondary} />
              <Text style={styles.serverToggleText}>
                {showServerConfig ? 'Hide Server URL' : 'Configure Server URL'}
              </Text>
            </TouchableOpacity>

            {showServerConfig ? (
              <View style={styles.serverBox}>
                <Text style={styles.label}>Backend / Tunnel HTTPS URL</Text>
                <TextInput
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  placeholder="https://your-tunnel.trycloudflare.com"
                  placeholderTextColor={Theme.colors.textSecondary}
                  autoCapitalize="none"
                  keyboardType="url"
                  style={styles.input}
                />
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 6 }}>
              <TouchableOpacity
                onPress={() => Linking.openURL(`${ENV.API_URL.replace(/\/api\/?$/, '')}/privacy-policy`).catch(() => {})}
              >
                <Text style={styles.serverToggleText}>Privacy Policy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Linking.openURL(`${ENV.API_URL.replace(/\/api\/?$/, '')}/terms-and-conditions`).catch(() => {})}
              >
                <Text style={styles.serverToggleText}>Terms &amp; Conditions</Text>
              </TouchableOpacity>
            </View>
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
  serverToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    marginTop: 4,
  },
  serverToggleText: { fontSize: 13, fontWeight: '600', color: Theme.colors.textSecondary },
  serverBox: { gap: 8, marginTop: 4 },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    minHeight: 40,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxChecked: {
    backgroundColor: Theme.colors.primary,
  },
  checkboxTick: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  checkboxText: { flex: 1, fontSize: 13, color: Theme.colors.text, fontWeight: '600' },
});
