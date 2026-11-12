# GridGuardian AI Backend

Backend API and database for energy monitoring. Uses C# .NET 9 and PostgreSQL.

---

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [WSL 2](https://learn.microsoft.com/en-us/windows/wsl/install) (Windows users)
- PowerShell or Terminal

---

## Structure

```
gridguardai/
├── backend/
│   ├── Controllers/
│   ├── Models/
│   ├── Data/
│   ├── Program.cs
│   └── Dockerfile
├── frontend/
├── infrastructure/
│   └── init.sql
├── docker-compose.yml
└── README.md
```

---

## Setup

**1. Clone the repository**
```
git clone https://github.com/ShawnTheCreator/gridguardai.git
cd gridguardai
```

**2. Start:**

```powershell
docker compose up -d --build
```

Wait 15 seconds for database initialization.

---

## Test

Send data:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:5078/api/telemetry" -Body '{"deviceId": "Test_Unit_01", "current": 45.5}' -ContentType "application/json"
```

**Test Login:**
To authenticate via the API (`/api/auth/login`) or the frontend dashboard, use the seeded admin credentials:
- **Operator ID (Email):** `thabo@gridguard.co.za`
- **Access Key (Password):** `gridguard123`

Expected:
```
status    device          time
------    ------          ----
Saved     Test_Unit_01    2026-02-07T14:00:00...
```

---

## Troubleshooting

**500 Error:**
- Reset database:

```powershell
docker compose down -v
docker compose up -d --build
```

**View logs:**

```powershell
docker logs gridguardian_api --tail 50
```

---

**Stack:** .NET 9, TimescaleDB, Docker

---

## Phase 1 Additions

During the Phase 1 integration, the following key elements were added to the backend:

- **Authentication:** Established JWT-based authentication via `AuthController`, enabling `/api/auth/login`, `/api/auth/me`, and `/api/auth/logout`.
- **Telemetry Expansion:** Expanded the `Telemetry` data model and PostgreSQL schema to include new grid metrics: `Voltage`, `SupplyCurrent`, `MeterSum`, and `Differential`.
- **EF Core Mapping:** Fixed Linux/Docker case-sensitivity issues by explicitly mapping EF Core entities to their lowercase table equivalents (e.g. `[Table("users")]`).
- **HashGen Tool:** A utility located in `Backend/HashGen` was created to safely and easily generate valid `BCrypt.Net` password hashes for database seeding.