import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import BackgroundService from 'react-native-background-actions';
import Geolocation from 'react-native-geolocation-service';
import NetInfo from '@react-native-community/netinfo';
import { api } from './api';
import { socketManager } from './socket';
import { GpsPoint } from '../types';

export interface GpsStatusSnapshot {
  permissionGranted: boolean;
  permissionDeniedPermanent: boolean;
  gpsEnabled: boolean;
  internetConnected: boolean;
  trackingActive: boolean;
  lastCapturedLocation: GpsPoint | null;
  lastSyncedAt: string | null;
  queuedCount: number;
  statusMessage: string | null;
}

type Listener = (snap: GpsStatusSnapshot) => void;

class GpsService {
  private watchId: number | null = null;
  private driverId: string | null = null;
  private queue: GpsPoint[] = [];
  private lastEmitMs = 0;
  private netUnsub: (() => void) | null = null;
  private listeners: Set<Listener> = new Set();
  private permissionCheckedOnce = false;

  private state: GpsStatusSnapshot = {
    permissionGranted: false,
    permissionDeniedPermanent: false,
    gpsEnabled: true,
    internetConnected: true,
    trackingActive: false,
    lastCapturedLocation: null,
    lastSyncedAt: null,
    queuedCount: 0,
    statusMessage: null,
  };

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn({ ...this.state });
    return () => this.listeners.delete(fn);
  }

  private emit() {
    const snap = { ...this.state, queuedCount: this.queue.length };
    this.listeners.forEach((fn) => fn(snap));
  }

  getSnapshot(): GpsStatusSnapshot {
    return { ...this.state, queuedCount: this.queue.length };
  }

  async checkAndRequestPermissions(): Promise<boolean> {
    if (this.state.permissionGranted) return true;
    if (this.permissionCheckedOnce && this.state.permissionDeniedPermanent) {
      Alert.alert(
        'Location Permission Required',
        'Location permission was denied. Please enable Location ("Allow all the time") in Device Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }

    this.permissionCheckedOnce = true;

    if (Platform.OS === 'android') {
      const fine = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Access Required',
          message:
            'Your location is required to share your live cab location with the company administrator during an active ride.',
          buttonPositive: 'Continue',
          buttonNegative: 'Cancel',
        }
      );

      if (fine !== PermissionsAndroid.RESULTS.GRANTED) {
        this.state.permissionGranted = false;
        this.state.permissionDeniedPermanent = fine === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
        this.emit();
        return false;
      }

      if (Platform.Version >= 29) {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          {
            title: 'Background Location Access',
            message:
              'Your location is required to share your live cab location with the company administrator during an active ride.',
            buttonPositive: 'Allow',
          }
        );
      }

      this.state.permissionGranted = true;
      this.state.permissionDeniedPermanent = false;
      this.emit();
      return true;
    }

    const iosStatus = await Geolocation.requestAuthorization('always');
    const granted = iosStatus === 'granted';
    this.state.permissionGranted = granted;
    this.state.permissionDeniedPermanent = !granted;
    this.emit();
    return granted;
  }

  async checkConnectivity(): Promise<boolean> {
    const net = await NetInfo.fetch();
    const ok = Boolean(net.isConnected && net.isInternetReachable !== false);
    this.state.internetConnected = ok;
    this.emit();
    return ok;
  }

  getCurrentPosition(): Promise<GpsPoint> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (pos) => {
          this.state.gpsEnabled = true;
          const pt: GpsPoint = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? 0,
            capturedAt: new Date(pos.timestamp).toISOString(),
          };
          this.state.lastCapturedLocation = pt;
          this.emit();
          resolve(pt);
        },
        (err) => {
          if (err.code === 2 || err.code === 1) {
            this.state.gpsEnabled = false;
            this.state.statusMessage = 'GPS unavailable';
            this.emit();
          }
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    });
  }

  async startRideTracking(driverId: string): Promise<void> {
    this.driverId = driverId;
    this.state.trackingActive = true;
    this.state.statusMessage = null;
    this.emit();

    if (!this.netUnsub) {
      this.netUnsub = NetInfo.addEventListener((net) => {
        const connected = Boolean(net.isConnected && net.isInternetReachable !== false);
        const wasOffline = !this.state.internetConnected;
        this.state.internetConnected = connected;

        if (!connected) {
          this.state.statusMessage = 'Internet disconnected – location updates paused.';
          this.emit();
        } else {
          this.state.statusMessage = null;
          this.emit();
          if (wasOffline || this.queue.length > 0) {
            this.flushQueue();
          }
        }
      });
    }

    const bgTask = async () => {
      await new Promise((resolve) => {
        this.watchId = Geolocation.watchPosition(
          (pos) => {
            this.state.gpsEnabled = true;
            const now = Date.now();
            if (now - this.lastEmitMs < 4500) return;
            this.lastEmitMs = now;

            const pt: GpsPoint = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy ?? 0,
              capturedAt: new Date(pos.timestamp).toISOString(),
            };
            this.state.lastCapturedLocation = pt;
            this.dispatchLocation(pt);
          },
          () => {
            this.state.gpsEnabled = false;
            this.state.statusMessage = 'GPS unavailable';
            this.emit();
          },
          {
            enableHighAccuracy: true,
            distanceFilter: 10,
            interval: 5000,
            fastestInterval: 4000,
            showsBackgroundLocationIndicator: true,
            forceRequestLocation: true,
          }
        );

        const guard = setInterval(() => {
          if (!BackgroundService.isRunning()) {
            clearInterval(guard);
            resolve(undefined);
          }
        }, 5000);
      });
    };

    if (!BackgroundService.isRunning()) {
      await BackgroundService.start(bgTask, {
        taskName: 'CabLiveTracking',
        taskTitle: 'Active Ride GPS Tracking',
        taskDesc: 'Sharing live cab location with company administrator',
        taskIcon: { name: 'ic_launcher', type: 'mipmap' },
        color: '#1D4ED8',
        parameters: {},
      });
    }
  }

  private async dispatchLocation(pt: GpsPoint): Promise<void> {
    if (!this.state.internetConnected) {
      this.queue.push(pt);
      this.state.statusMessage = 'Internet disconnected – location updates paused.';
      this.emit();
      return;
    }

    const socket = await socketManager.connect();
    if (socket?.connected) {
      socket.emit('driver:location:update', pt);
      this.state.lastSyncedAt = new Date().toISOString();
      this.state.statusMessage = null;
      this.emit();
      if (this.queue.length > 0) {
        await this.flushQueue();
      }
      return;
    }

    // Fallback to REST or queue if offline
    if (this.driverId) {
      try {
        const res = await api.post(`/drivers/${this.driverId}/location`, pt);
        this.state.lastSyncedAt = res.data.data.lastSyncedAt || new Date().toISOString();
        this.state.statusMessage = null;
        this.emit();
      } catch {
        this.queue.push(pt);
        this.state.statusMessage = 'Internet disconnected – location updates paused.';
        this.emit();
      }
    }
  }

  async flushQueue(): Promise<void> {
    if (!this.driverId || this.queue.length === 0) return;
    const batch = [...this.queue];
    try {
      const res = await api.post(`/drivers/${this.driverId}/location`, { locations: batch });
      this.queue = this.queue.slice(batch.length);
      this.state.lastSyncedAt = res.data.data.lastSyncedAt || new Date().toISOString();
      this.state.statusMessage = null;
      this.emit();
    } catch {
      // Keep queued until connectivity stabilizes
    }
  }

  async stopRideTracking(): Promise<void> {
    this.state.trackingActive = false;
    this.state.statusMessage = null;
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (BackgroundService.isRunning()) {
      await BackgroundService.stop();
    }
    if (this.netUnsub) {
      this.netUnsub();
      this.netUnsub = null;
    }
    await this.flushQueue();
    this.emit();
  }
}

export const gpsService = new GpsService();
