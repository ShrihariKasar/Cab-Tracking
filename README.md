# Cab Service — Live Tracking & Fleet Management Platform

Production-grade cab, employee transportation, and corporate fleet management ecosystem with real-time GPS tracking.

## Monorepo Structure

- `backend/` — Node.js + Express + TypeScript REST API, Socket.IO real-time gateway, PostgreSQL + PostGIS, Redis cache, FCM notifications
- `mobile/` — React Native + TypeScript mobile application (Customer & Driver experiences, background GPS tracking, Keychain/Keystore token storage)
- `admin/` — React + TypeScript + Vite responsive Admin Web Dashboard (Live Fleet Map with clustering, RBAC, Driver/Vehicle/Booking management, CSV/Excel reports)
- `documentation/` — Architecture, API, Database Schema, GPS Tracking, Security, and Deployment guides

## Documentation

- [API Documentation](documentation/API_DOCUMENTATION.md)
- [Database Schema](documentation/DATABASE_SCHEMA.md)
- [GPS Tracking Architecture](documentation/GPS_TRACKING.md)
- [Security Architecture](documentation/SECURITY.md)
- [Deployment & Release Checklist](documentation/DEPLOYMENT.md)
