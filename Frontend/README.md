# SolarShare - Frontend

SolarShare is a community solar co-ownership platform empowering residents to co-own township solar mini-grids and earn monthly payouts from clean electricity sold locally to homes and spaza shops.

---

## Overview

- **Co-Ownership Model**: Buy shares (R100 each) in township solar systems (SPVs).
- **Automated Meter Proof**: Physical ESP32 energy meter cryptographically signs every kilowatt-hour generated and sold.
- **Transparent Revenue Sharing**: Public onchain ledger records electricity generated, funds deposited, and distributes claims monthly to co-owners.
- **Automatic Protection**: Theft or tamper anomalies pause payouts automatically until verified.
- **Mobile-First & Accessible**: Designed for smartphone browsers with zero app downloads, SMS signup, and standard payment rails (EFT, Card, Mobile Money).

---

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, Lucide React
- **Web3 / Blockchain**: Viem v2 (Base Sepolia)
- **Deployment**: Standalone Node.js Docker container

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the SolarShare application.

---

## Public & Protected Routes

- `/`: SolarShare Landing Page (7 investment steps, trust architecture, transparent risk disclosures)
- `/solar`: Community Solar Asset Dashboard & Shares overview
- `/solar/debug`: Live onchain contract state and meter telemetry verification
- `/login`: Investor & Operator authentication
- `/operator`: Protected Operator Console
