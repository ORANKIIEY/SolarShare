# GridGuard AI - Frontend

A comprehensive municipal grid monitoring and theft detection system with real-time telemetry, emergency alerts, and location-based access control.

---

## Features

### **Real-Time Monitoring**
- **Live Telemetry**: Real-time data streaming from grid infrastructure
- **Emergency Alerts**: Push notifications for critical events
- **Location-Based Access**: Geographic area restrictions for field workers
- **Offline Support**: Full functionality without internet connection

### **Role-Based Dashboards**
- **Worker Dashboard**: Field operations with location filtering
- **Governance Dashboard**: Management oversight and analytics
- **Developer Dashboard**: System monitoring and debugging tools
- **Admin Dashboard**: Full system administration

### **Advanced Capabilities**
- **AI-Powered Detection**: Machine learning for theft identification
- **Geographic Filtering**: Workers see only assigned areas
- **Real-Time Sync**: Automatic data synchronization
- **Mobile Responsive**: Optimized for field operations

---

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Backend**: .NET 9, TimescaleDB, PostgreSQL
- **Real-Time**: WebSocket, MQTT, SignalR
- **AI Integration**: Huawei ModelArts, IoTDA
- **Infrastructure**: Docker, Kubernetes, Huawei Cloud

---

## Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js 18+](https://nodejs.org/)
- [PowerShell/Terminal](https://docs.microsoft.com/en-us/powershell/)

### 1. Clone Repository
```bash
git clone https://github.com/ShawnTheCreator/gridguardai.git
cd gridguardai
```

### 2. Start Backend
```bash
cd Backend
docker compose up -d --build
```

### 3. Start Frontend
```bash
cd Frontend
npm install
npm run dev
```

### 4. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5078
- **Admin Dashboard**: http://localhost:3000/admin

---

## Login Credentials

### **Seeded Demo Accounts**

| Role | Email | Password | Dashboard |
|-------|--------|----------|------------|
| **Worker** | `thabo@gridguard.co.za` | `gridguard123` | http://localhost:3000/worker |
| **Governance** | `patrick@gridguard.co.za` | `governance123` | http://localhost:3000/governance |
| **Developer** | `shawn@gridguard.co.za` | `dev123` | http://localhost:3000/dev |
| **Admin** | `admin@gridguard.co.za` | `admin123` | http://localhost:3000/admin |

### **Geographic Access Control**
- **Johannesburg Workers**: See only Gauteng grid data
- **Durban Workers**: See only KZN grid data
- **Cape Town Workers**: See only Western Cape grid data

---

## API Endpoints

### **Authentication**
- `POST /api/auth/login` - User authentication
- `GET /api/auth/me` - Current user info
- `POST /api/auth/logout` - User logout

### **Real-Time Data**
- `GET /api/telemetry/recent` - Latest telemetry data
- `POST /api/telemetry` - Submit sensor data
- `GET /api/incidents` - Active incidents/alerts

### **Dashboard**
- `GET /api/dashboard/summary` - System metrics
- `GET /api/assets` - Grid infrastructure assets
- `GET /api/settings` - System configuration

---

## Configuration

### **Environment Variables**
Create `.env.local` in Frontend directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:5078
NEXT_PUBLIC_WS_URL=ws://localhost:5078
```

### **Backend Configuration**
Backend uses TimescaleDB with automatic schema creation and data seeding.

---

## Location Features

### **Geographic Areas**
- **Johannesburg**: Gauteng Province
- **Pretoria**: Gauteng Province  
- **Durban**: KwaZulu-Natal
- **Pietermaritzburg**: KwaZulu-Natal
- **Cape Town**: Western Cape

### **Automatic Detection**
- **GPS Location**: Browser geolocation API
- **Area Assignment**: Automatic based on coordinates
- **Access Control**: Data filtering by assigned area

---

## Mobile Features

### **Offline Mode**
- **Local Storage**: Caches work orders and telemetry
- **Sync on Reconnect**: Automatic data synchronization
- **Manual Sync**: User-triggered updates
- **Connection Status**: Visual indicators

### **Push Notifications**
- **Browser Notifications**: Native OS alerts
- **Emergency Priority**: Critical events immediately
- **Actionable Alerts**: Quick response buttons
- **Permission Management**: Graceful fallbacks

---

## Emergency Response

### **Alert Types**
- **Theft Detection**: AI-powered pattern recognition
- **Overload Protection**: Threshold-based alerts
- **Outage Detection**: Power loss notifications
- **Maintenance Required**: Predictive maintenance alerts

### **Severity Levels**
- **Critical**: Immediate response required
- **High**: Response within 1 hour
- **Medium**: Response within 4 hours
- **Low**: Response within 24 hours

---

## Analytics & Reporting

### **Real-Time Metrics**
- **Power Consumption**: Live grid load monitoring
- **Voltage Stability**: Quality of supply metrics
- **Current Flow**: Distribution analysis
- **Asset Health**: Infrastructure status

### **Historical Data**
- **Trend Analysis**: Long-term patterns
- **Performance Metrics**: System efficiency
- **Incident Reports**: Detailed event logs
- **Maintenance History**: Service records

---

## Development

### **Project Structure**
```
Frontend/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/        # Reusable UI components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and API client
│   └── features/         # Feature-based modules
├── public/               # Static assets
└── .env.local           # Environment configuration
```

### **Key Components**
- **RealTimeTelemetry**: Live data visualization
- **EmergencyAlerts**: Notification system
- **LocationAwareMap**: Geographic filtering
- **OfflineModeIndicator**: Connection status

### **Custom Hooks**
- **useWebSocket**: Real-time data streaming
- **useGeolocation**: GPS-based area assignment
- **useNotifications**: Push notification management
- **useOfflineMode**: Offline functionality

---

## Deployment

### **Docker Deployment**
```bash
docker compose up -d --build
```

### **Production Environment**
1. Set environment variables
2. Configure database connection
3. Deploy to cloud provider
4. Set up SSL certificates

### **Monitoring**
- **Health Checks**: `/api/health` endpoint
- **Metrics**: Prometheus-compatible endpoints
- **Logging**: Structured JSON logs
- **Alerting**: Webhook integration

---

## Security

### **Authentication**
- **JWT Tokens**: Secure session management
- **Role-Based Access**: Permission levels
- **API Protection**: Bearer token validation
- **Session Timeout**: Automatic logout

### **Data Protection**
- **Encryption**: TLS/SSL for all traffic
- **Input Validation**: SQL injection prevention
- **Rate Limiting**: API abuse protection
- **Audit Logging**: Complete access tracking

---

## Contributing

1. Fork the repository
2. Create feature branch
3. Make your changes
4. Add tests
5. Submit pull request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

For technical support and questions:
- **Documentation**: See `/docs` directory
- **Issues**: GitHub Issues
- **Email**: support@gridguardai.co.za

---

**GridGuard AI - Protecting Municipal Infrastructure with Intelligence** 

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
