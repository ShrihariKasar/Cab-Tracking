import * as Keychain from 'react-native-keychain';

const TOKEN_SERVICE = 'com.cabtracking.mvp.token';
const USER_SERVICE = 'com.cabtracking.mvp.user';
const SERVER_SERVICE = 'com.cabtracking.mvp.serverUrl';

export async function saveServerUrl(url: string): Promise<void> {
  const cleaned = url.trim().replace(/\/+$/, '');
  if (!cleaned) {
    await Keychain.resetGenericPassword({ service: SERVER_SERVICE });
    return;
  }
  await Keychain.setGenericPassword('server', cleaned, {
    service: SERVER_SERVICE,
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}

export async function getServerUrl(): Promise<string | null> {
  const res = await Keychain.getGenericPassword({ service: SERVER_SERVICE });
  return res ? res.password : null;
}

export async function saveSession(token: string, userJson: string): Promise<void> {
  await Keychain.setGenericPassword('token', token, {
    service: TOKEN_SERVICE,
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  await Keychain.setGenericPassword('user', userJson, {
    service: USER_SERVICE,
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}

export async function getToken(): Promise<string | null> {
  const res = await Keychain.getGenericPassword({ service: TOKEN_SERVICE });
  return res ? res.password : null;
}

export async function getSavedUser(): Promise<string | null> {
  const res = await Keychain.getGenericPassword({ service: USER_SERVICE });
  return res ? res.password : null;
}

export async function clearSession(): Promise<void> {
  await Keychain.resetGenericPassword({ service: TOKEN_SERVICE });
  await Keychain.resetGenericPassword({ service: USER_SERVICE });
}
