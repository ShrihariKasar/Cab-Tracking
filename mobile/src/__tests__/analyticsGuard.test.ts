import {
  getPrivacyPreferences,
  maskSensitiveFields,
  shouldAllowAnalytics,
  shouldAllowSessionReplay,
  updatePrivacyPreferences,
} from '../services/analyticsGuard';

jest.mock('../services/api', () => ({
  api: {
    get: jest.fn().mockResolvedValue({ data: { data: { analyticsConsent: false, sessionReplayConsent: false } } }),
    post: jest.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

describe('CIPA Analytics & Session Replay Guard', () => {
  it('disables analytics and session replay by default before consent', () => {
    expect(getPrivacyPreferences()).toEqual({
      analyticsConsent: false,
      sessionReplayConsent: false,
    });
    expect(shouldAllowAnalytics()).toBe(false);
    expect(shouldAllowSessionReplay('DriverDashboardScreen')).toBe(false);
  });

  it('excludes sensitive auth/profile screens from session replay even after consent and masks sensitive fields', async () => {
    await updatePrivacyPreferences('drv-1', {
      analyticsConsent: true,
      sessionReplayConsent: true,
    });

    expect(shouldAllowAnalytics()).toBe(true);
    expect(shouldAllowSessionReplay('DriverDashboardScreen')).toBe(true);
    expect(shouldAllowSessionReplay('LoginScreen')).toBe(false);
    expect(shouldAllowSessionReplay('DriverProfileScreen')).toBe(false);

    const masked = maskSensitiveFields({
      password: 'secret',
      mobileNumber: '+15550000002',
      dateOfBirth: '2000-01-01',
      rideStatus: 'ACTIVE',
    });
    expect(masked).toEqual({
      password: '[REDACTED]',
      mobileNumber: '[REDACTED]',
      dateOfBirth: '[REDACTED]',
      rideStatus: 'ACTIVE',
    });
  });
});
