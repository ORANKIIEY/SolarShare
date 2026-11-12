# GridGuard AI - Technical Documentation

---

## 🏗 System Architecture

### **Frontend Architecture**
```
┌─────────────────────────────────────────────────────────┐
│                GridGuard AI Frontend              │
│  Next.js 14 + TypeScript + TailwindCSS    │
├─────────────────────────────────────────────────────────┤
│  App Router (src/app/)                     │
│  ├── (auth)/login - Authentication         │
│  ├── worker/ - Field Operations           │
│  ├── governance/ - Management Dashboard      │
│  ├── dev/ - Developer Tools              │
│  └── admin/ - System Administration      │
├─────────────────────────────────────────────────────────┤
│  Components (src/components/)                │
│  ├── ui/ - Base UI Components          │
│  ├── telemetry/ - Real-Time Data          │
│  ├── notifications/ - Alert System         │
│  ├── offline/ - Connection Management       │
│  └── layout/ - Navigation Components     │
├─────────────────────────────────────────────────────────┤
│  Hooks (src/hooks/)                         │
│  ├── useWebSocket - Real-Time Streaming     │
│  ├── useGeolocation - GPS Location         │
│  ├── useNotifications - Push Alerts        │
│  ├── useOfflineMode - Offline Support      │
│  └── useAuth - Authentication           │
├─────────────────────────────────────────────────────────┤
│  Features (src/features/)                    │
│  └── map/ - Location-Aware Mapping        │
└─────────────────────────────────────────────────────────┘
```

### **Backend Integration**
```
Frontend (Next.js) ←→ Backend (.NET 9) ←→ Database (TimescaleDB)
       ↓                      ↓                    ↓
  HTTP/HTTPS            JWT Auth            PostgreSQL
  WebSocket             SignalR              Time-Series Data
  REST APIs             EF Core              AI Model Storage
```

---

## 🔌 Authentication & Authorization

### **JWT-Based Authentication**
```typescript
// Login Flow
const login = async (email, password) => {
  const response = await apiLogin(email, password);
  if (response.token) {
    localStorage.setItem('gridguard_token', response.token);
    localStorage.setItem('gridguard_user', JSON.stringify(response.user));
    router.push(`/${response.user.role}`);
  }
};

// Protected API Calls
const authenticatedFetch = async (url, options) => {
  const token = localStorage.getItem('gridguard_token');
  return fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};
```

### **Role-Based Access Control**
- **Worker**: Field operations, assigned geographic area only
- **Governance**: Management oversight, analytics, reporting
- **Developer**: System monitoring, debugging, technical tools
- **Admin**: Full system administration

### **Middleware Protection**
```typescript
// src/proxy.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('gridguard_token')?.value;
  const user = JSON.parse(request.cookies.get('gridguard_user')?.value || '{}');
  
  // Route protection based on role
  if (pathname.startsWith('/worker') && user.role !== 'worker') {
    return NextResponse.redirect(new URL('/worker', request.url));
  }
  
  return NextResponse.next();
}
```

---

## 🌍 Geographic Access Control

### **Location Detection System**
```typescript
// src/hooks/useGeolocation.ts
const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [assignedArea, setAssignedArea] = useState(null);
  
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const area = detectGeographicArea(latitude, longitude);
        setAssignedArea(area);
      },
      (error) => console.error('Location access denied:', error)
    );
  }, []);
  
  return { location, assignedArea };
};
```

### **Area Boundaries**
```typescript
const GEOGRAPHIC_AREAS = {
  johannesburg: {
    name: 'Johannesburg',
    province: 'Gauteng',
    coordinates: {
      center: { lat: -26.2041, lng: 28.0473 },
      bounds: { north: -26.0, south: -26.3, east: 28.2, west: 27.9 }
    }
  },
  durban: {
    name: 'Durban',
    province: 'KwaZulu-Natal',
    coordinates: {
      center: { lat: -29.8587, lng: 31.0218 },
      bounds: { north: -29.7, south: -30.0, east: 31.2, west: 30.8 }
    }
  },
  capeTown: {
    name: 'Cape Town',
    province: 'Western Cape',
    coordinates: {
      center: { lat: -33.9249, lng: 18.4241 },
      bounds: { north: -33.8, south: -34.0, east: 18.6, west: 18.2 }
    }
  }
};
```

### **Data Filtering**
```typescript
// Worker Dashboard - Only shows assigned area data
const workOrders = allWorkOrders.filter(order => 
  assignedArea && order.area === assignedArea.name
);

const telemetry = allTelemetry.filter(reading => 
  isWithinBounds(reading.coordinates, assignedArea.coordinates.bounds)
);
```

---

## 📡 Real-Time Data Streaming

### **WebSocket Integration**
```typescript
// src/hooks/useWebSocket.ts
const useWebSocket = (url: string) => {
  const [telemetry, setTelemetry] = useState([]);
  const [alerts, setAlerts] = useState([]);
  
  const connect = () => {
    const ws = new WebSocket(url);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'telemetry':
          setTelemetry(prev => [...prev.slice(-99), data.payload]);
          break;
        case 'alert':
          setAlerts(prev => [data.payload, ...prev.slice(-49)]);
          break;
      }
    };
  };
  
  return { telemetry, alerts, isConnected };
};
```

### **API Polling Fallback**
```typescript
// When WebSocket unavailable, use HTTP polling
const fetchTelemetryData = async () => {
  const response = await fetch('/api/telemetry/recent', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.ok) {
    const data = await response.json();
    setTelemetry(transformBackendData(data));
  }
};

// Poll every 5 seconds
useEffect(() => {
  const interval = setInterval(fetchTelemetryData, 5000);
  return () => clearInterval(interval);
}, []);
```

---

## 🚨 Emergency Alert System

### **Push Notification Architecture**
```typescript
// src/hooks/useNotifications.ts
const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  
  // Request browser permission
  const requestPermission = async () => {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };
  
  // Show browser notification
  const showBrowserNotification = (title, message, options) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        tag: 'gridguard-alert',
        requireInteraction: false,
        ...options
      });
    }
  };
  
  return { notifications, requestPermission, showBrowserNotification };
};
```

### **Alert Severity Levels**
```typescript
interface AlertData {
  id: string;
  type: 'theft' | 'overload' | 'outage' | 'maintenance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  poleId: string;
  message: string;
  timestamp: string;
  coordinates?: { lat: number; lng: number };
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}
```

### **Emergency Response Workflow**
1. **Detection**: AI identifies unusual pattern
2. **Alert**: Push notification sent to all relevant users
3. **Assignment**: Work order created and assigned to field worker
4. **Response**: Worker acknowledges and begins investigation
5. **Resolution**: Incident resolved and logged

---

## 📱 Offline Mode Support

### **Offline Architecture**
```typescript
// src/hooks/useOfflineMode.ts
const useOfflineMode = () => {
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineData, setOfflineData] = useState({
    workOrders: [],
    telemetry: [],
    alerts: [],
    lastSync: new Date().toISOString()
  });
  
  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => {
      setIsOfflineMode(false);
      syncData(); // Sync when back online
    };
    
    const handleOffline = () => {
      setIsOfflineMode(true);
      saveToOfflineStorage(); // Cache current data
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return { isOfflineMode, offlineData, syncData };
};
```

### **Data Synchronization**
```typescript
const syncData = async () => {
  if (!navigator.onLine) return;
  
  try {
    // Sync work orders
    await fetch('/api/work-orders/sync', {
      method: 'POST',
      body: JSON.stringify({
        workOrders: offlineData.workOrders,
        lastSync: offlineData.lastSync
      })
    });
    
    // Sync telemetry
    await fetch('/api/telemetry/sync', {
      method: 'POST',
      body: JSON.stringify({
        telemetry: offlineData.telemetry,
        lastSync: offlineData.lastSync
      })
    });
    
    // Clear offline storage after successful sync
    localStorage.removeItem('offlineData');
  } catch (error) {
    console.error('Sync failed:', error);
  }
};
```

---

## 📊 Data Models & Interfaces

### **Core Data Types**
```typescript
interface TelemetryData {
  poleId: string;
  timestamp: string;
  voltage: number;
  current: number;
  power: number;
  status: 'normal' | 'warning' | 'critical';
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface WorkOrder {
  id: string;
  type: "inspection" | "emergency" | "maintenance";
  priority: "low" | "medium" | "high" | "critical";
  location: string;
  poleId: string;
  description: string;
  estimatedTime: string;
  status: "pending" | "in_progress" | "completed";
  assignedAt: string;
  area: string;
}

interface AlertData {
  id: string;
  type: 'theft' | 'overload' | 'outage' | 'maintenance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  poleId: string;
  message: string;
  timestamp: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}
```

### **API Response Types**
```typescript
interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'worker' | 'governance' | 'dev' | 'admin';
  };
}

interface DashboardSummary {
  totalNodes: number;
  activeAlerts: number;
  investigatingCount: number;
  avgLoad: number;
  latestConfidence: number;
  totalSectorLoad: number;
  activeLosses: number;
}
```

---

## 🔧 Component Architecture

### **Real-Time Telemetry Component**
```typescript
// src/components/telemetry/RealTimeTelemetry.tsx
const RealTimeTelemetry = ({ assignedArea }) => {
  const { telemetry, alerts, isConnected } = useWebSocket(WS_URL);
  
  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <ConnectionStatus isConnected={isConnected} />
      
      {/* Metrics Cards */}
      <MetricsGrid telemetry={telemetry} />
      
      {/* Live Alerts */}
      <AlertsList alerts={alerts} />
    </div>
  );
};
```

### **Location-Aware Map Component**
```typescript
// src/features/map/LocationAwareMap.tsx
const LocationAwareMap = ({ onPoleClick, assignedArea }) => {
  return (
    <div className="relative w-full h-96">
      {/* Area Badge */}
      {assignedArea && (
        <AreaBadge area={assignedArea} />
      )}
      
      {/* Restricted Notice */}
      {assignedArea && (
        <RestrictedAreaNotice area={assignedArea} />
      )}
      
      {/* Map Iframe */}
      <iframe
        src={generateMapUrl(assignedArea)}
        className="w-full h-full border-0"
        title={`GridGuard Map - ${assignedArea?.name || 'South Africa'}`}
      />
      
      {/* Pole Markers */}
      <PoleMarkers 
        poles={filterPolesByArea(allPoles, assignedArea)}
        onPoleClick={onPoleClick}
      />
    </div>
  );
};
```

---

## 🚀 Performance Optimizations

### **Real-Time Data Handling**
```typescript
// Efficient data updates with React.memo
const TelemetryCard = React.memo(({ data }) => {
  return (
    <div className="border rounded-lg p-4">
      <div className="text-2xl font-bold">
        {data.voltage.toFixed(1)}V
      </div>
    </div>
  );
});

// Debounced API calls
const useDebouncedTelemetry = () => {
  const [telemetry, setTelemetry] = useState([]);
  
  const debouncedFetch = useMemo(
    () => debounce(fetchTelemetryData, 1000),
    []
  );
  
  useEffect(() => {
    debouncedFetch();
  }, [debouncedFetch]);
  
  return telemetry;
};
```

### **Memory Management**
```typescript
// Limit data arrays to prevent memory leaks
const [telemetry, setTelemetry] = useState<TelemetryData[]>([]);

// Keep only last 100 readings
const addTelemetry = (newData: TelemetryData) => {
  setTelemetry(prev => {
    const updated = [...prev, newData];
    return updated.slice(-100); // Keep last 100 items
  });
};

// Cleanup on unmount
useEffect(() => {
  return () => {
    // Cleanup WebSocket connections
    if (wsRef.current) {
      wsRef.current.close();
    }
  };
}, []);
```

---

## 🔒 Security Implementation

### **JWT Token Management**
```typescript
// Token storage with security considerations
const tokenStorage = {
  set: (token: string) => {
    localStorage.setItem('gridguard_token', token);
    // Set secure cookie for server-side validation
    document.cookie = `gridguard_token=${token}; Secure; HttpOnly; SameSite=Strict`;
  },
  
  get: () => {
    return localStorage.getItem('gridguard_token');
  },
  
  clear: () => {
    localStorage.removeItem('gridguard_token');
    document.cookie = 'gridguard_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
};
```

### **API Security Headers**
```typescript
const secureFetch = async (url: string, options: RequestInit) => {
  const token = tokenStorage.get();
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Requested-With': 'XMLHttpRequest',
      'Cache-Control': 'no-cache',
      ...options.headers
    },
    credentials: 'same-origin'
  });
};
```

---

## 📈 Monitoring & Analytics

### **Performance Metrics**
```typescript
// Component performance tracking
const usePerformanceMetrics = () => {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    apiResponseTime: 0,
    errorCount: 0
  });
  
  const trackRender = useCallback(() => {
    const start = performance.now();
    return () => {
      const end = performance.now();
      setMetrics(prev => ({
        ...prev,
        renderTime: end - start
      }));
    };
  }, []);
  
  return { metrics, trackRender };
};
```

### **Error Tracking**
```typescript
// Global error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: any) {
    // Log to monitoring service
    fetch('/api/errors', {
      method: 'POST',
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        component: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      })
    });
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

---

## 🧪 Testing Strategy

### **Unit Testing**
```typescript
// Component testing with React Testing Library
describe('RealTimeTelemetry', () => {
  it('displays telemetry data correctly', () => {
    const mockTelemetry = [
      { poleId: 'P-001', voltage: 220, current: 45 }
    ];
    
    render(<RealTimeTelemetry telemetry={mockTelemetry} />);
    
    expect(screen.getByText('220V')).toBeInTheDocument();
    expect(screen.getByText('45A')).toBeInTheDocument();
  });
});
```

### **Integration Testing**
```typescript
// API integration testing
describe('Backend Integration', () => {
  it('fetches real telemetry data', async () => {
    const { result } = await renderHook(() => useWebSocket());
    
    await waitFor(() => {
      expect(result.current.telemetry.length).toBeGreaterThan(0);
    });
  });
});
```

---

## 🚀 Deployment Configuration

### **Environment Variables**
```bash
# .env.local (Development)
NEXT_PUBLIC_API_URL=http://localhost:5078
NEXT_PUBLIC_WS_URL=ws://localhost:5078

# .env.production (Production)
NEXT_PUBLIC_API_URL=https://api.gridguardai.co.za
NEXT_PUBLIC_WS_URL=wss://api.gridguardai.co.za
```

### **Docker Configuration**
```dockerfile
# Frontend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### **Production Build**
```bash
# Optimized production build
npm run build

# Static export (if needed)
npm run export

# Start production server
npm start
```

---

## 📚 API Reference

### **Authentication Endpoints**
```
POST /api/auth/login
Content-Type: application/json
Body: { email: string, password: string }
Response: { token: string, user: User }

GET /api/auth/me
Headers: Authorization: Bearer <token>
Response: { id: string, email: string, role: string }

POST /api/auth/logout
Headers: Authorization: Bearer <token>
Response: { success: boolean }
```

### **Telemetry Endpoints**
```
GET /api/telemetry/recent
Headers: Authorization: Bearer <token>
Response: TelemetryData[]

POST /api/telemetry
Headers: Authorization: Bearer <token>
Body: TelemetryData
Response: { status: "Saved", device: string, time: string }
```

### **Dashboard Endpoints**
```
GET /api/dashboard/summary
Headers: Authorization: Bearer <token>
Response: DashboardSummary

GET /api/incidents
Headers: Authorization: Bearer <token>
Response: Incident[]

GET /api/assets
Headers: Authorization: Bearer <token>
Response: Asset[]
```

---

## 🔧 Troubleshooting

### **Common Issues**
1. **WebSocket Connection Failed**
   - Check backend is running on port 5078
   - Verify firewall allows WebSocket connections
   - Check SSL certificate in production

2. **Geolocation Not Working**
   - Enable location permissions in browser
   - Use HTTPS in production
   - Check browser compatibility

3. **Authentication Errors**
   - Verify JWT token is valid
   - Check token expiration
   - Ensure proper Authorization header

4. **Performance Issues**
   - Check data array sizes (limit to 100 items)
   - Use React.memo for expensive components
   - Implement virtual scrolling for large lists

### **Debug Tools**
```typescript
// Development debugging
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('Debug: Telemetry data', telemetry);
  console.log('Debug: User location', location);
  console.log('Debug: API responses', responses);
}

// Performance debugging
const perfObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('Performance:', entry.name, entry.duration);
  }
});

perfObserver.observe({ entryTypes: ['measure'] });
```

---

**GridGuard AI - Technical Architecture Documentation** 📋
