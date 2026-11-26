export const ENV = {
  API_URL: process.env.API_URL || 'https://fleetpulse-backend-w864.onrender.com/api',
  SOCKET_URL: process.env.SOCKET_URL || 'https://fleetpulse-backend-w864.onrender.com',
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
} as const;
