export const ENV = {
  API_URL: process.env.API_URL || 'http://10.0.2.2:4000/api',
  SOCKET_URL: process.env.SOCKET_URL || 'http://10.0.2.2:4000',
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
} as const;
