import { api } from './api';

export interface PrivacyPreferences {
  analyticsConsent: boolean;
  sessionReplayConsent: boolean;
}

export const DEFAULT_PRIVACY_PREFERENCES: PrivacyPreferences = {
  analyticsConsent: false,
  sessionReplayConsent: false,
};

export const SENSITIVE_FIELDS = new Set([
  'password',
  'mobileNumber',
  'token',
  'fcmToken',
  'verificationCode',
  'dateOfBirth',
  'parentContact',
]);

export const EXCLUDED_REPLAY_SCREENS = new Set([
  'LoginScreen',
  'RegisterScreen',
  'DriverProfileScreen',
  'AdminProfileScreen',
]);

let currentPrefs: PrivacyPreferences = { ...DEFAULT_PRIVACY_PREFERENCES };

export function getPrivacyPreferences(): PrivacyPreferences {
  return { ...currentPrefs };
}

export function shouldAllowAnalytics(): boolean {
  return currentPrefs.analyticsConsent === true;
}

export function shouldAllowSessionReplay(screenName: string): boolean {
  if (!currentPrefs.sessionReplayConsent) return false;
  if (EXCLUDED_REPLAY_SCREENS.has(screenName)) return false;
  return true;
}

export function maskSensitiveFields<T extends Record<string, any>>(payload: T): Record<string, any> {
  const masked: Record<string, any> = {};
  for (const [key, val] of Object.entries(payload)) {
    masked[key] = SENSITIVE_FIELDS.has(key) ? '[REDACTED]' : val;
  }
  return masked;
}

export async function loadPrivacyPreferences(subjectKey: string): Promise<PrivacyPreferences> {
  try {
    const res = await api.get(`/compliance/privacy-preferences`, { params: { subjectKey } });
    const d = res.data?.data;
    currentPrefs = {
      analyticsConsent: Boolean(d?.analyticsConsent),
      sessionReplayConsent: Boolean(d?.sessionReplayConsent),
    };
  } catch {
    currentPrefs = { ...DEFAULT_PRIVACY_PREFERENCES };
  }
  return getPrivacyPreferences();
}

export async function updatePrivacyPreferences(
  subjectKey: string,
  prefs: PrivacyPreferences
): Promise<PrivacyPreferences> {
  currentPrefs = { ...prefs };
  try {
    await api.post('/compliance/privacy-preferences', {
      subjectKey,
      analyticsConsent: prefs.analyticsConsent,
      sessionReplayConsent: prefs.sessionReplayConsent,
    });
  } catch {
    // Keep local safe state if offline
  }
  return getPrivacyPreferences();
}
