"use client";

import { useState, useEffect } from 'react';

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

export function useWorkOrders(assignedArea?: any) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch work orders from backend
  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('gridguard_token');
      
      // Try to fetch from backend incidents API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/incidents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const incidents = await response.json();
        
        // Transform backend incidents to work orders
        const transformedWorkOrders: WorkOrder[] = incidents.map((incident: any) => ({
          id: incident.Id || `WO-${Date.now()}`,
          type: incident.Type === 'theft' ? 'emergency' : 
                incident.Type === 'maintenance' ? 'maintenance' : 'inspection',
          priority: incident.Severity === 'critical' ? 'critical' :
                   incident.Severity === 'high' ? 'high' :
                   incident.Severity === 'medium' ? 'medium' : 'low',
          location: incident.Location || `${assignedArea?.name || 'Unknown Area'}, ${assignedArea?.province || 'Unknown Province'}`,
          poleId: incident.AssetId || `P-${incident.Id}`,
          description: incident.Description || 'Field inspection required',
          estimatedTime: incident.EstimatedTime || '2 hours',
          status: incident.Status === 'active' ? 'pending' :
                  incident.Status === 'investigating' ? 'in_progress' : 'completed',
          assignedAt: incident.CreatedAt || new Date().toISOString(),
          area: assignedArea?.name || 'Unknown'
        }));

        setWorkOrders(transformedWorkOrders);
        setError(null);
      } else {
        throw new Error('Failed to fetch work orders');
      }
    } catch (error) {
      console.error('Error fetching work orders:', error);
      setError('Failed to load work orders');
      
      // Fallback to demo work orders
      const demoWorkOrders: WorkOrder[] = [
        {
          id: "WO-001",
          type: "emergency",
          priority: "critical",
          location: `${assignedArea?.name || 'Johannesburg'}, ${assignedArea?.province || 'Gauteng'}`,
          poleId: "P-402",
          description: "AI detected potential electricity theft at pole P-402",
          estimatedTime: "2 hours",
          status: "pending",
          assignedAt: new Date().toISOString(),
          area: assignedArea?.name || 'Johannesburg'
        },
        {
          id: "WO-002",
          type: "inspection",
          priority: "medium",
          location: `${assignedArea?.name || 'Johannesburg'}, ${assignedArea?.province || 'Gauteng'}`,
          poleId: "P-318",
          description: "Routine inspection and maintenance check",
          estimatedTime: "1 hour",
          status: "pending",
          assignedAt: new Date().toISOString(),
          area: assignedArea?.name || 'Johannesburg'
        }
      ];
      
      setWorkOrders(demoWorkOrders);
    } finally {
      setLoading(false);
    }
  };

  // Update work order status
  const updateWorkOrderStatus = async (orderId: string, status: "pending" | "in_progress" | "completed") => {
    try {
      const token = localStorage.getItem('gridguard_token');
      
      // Update backend incident status
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/incidents/${orderId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        // Update local state
        setWorkOrders(prev => prev.map(order => 
          order.id === orderId ? { ...order, status } : order
        ));
      } else {
        throw new Error('Failed to update work order');
      }
    } catch (error) {
      console.error('Error updating work order:', error);
      
      // Fallback: update local state only
      setWorkOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status } : order
      ));
    }
  };

  // Create new work order
  const createWorkOrder = async (workOrder: Omit<WorkOrder, 'id' | 'assignedAt'>) => {
    try {
      const token = localStorage.getItem('gridguard_token');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/incidents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: workOrder.type,
          severity: workOrder.priority,
          location: workOrder.location,
          assetId: workOrder.poleId,
          description: workOrder.description,
          estimatedTime: workOrder.estimatedTime,
          status: workOrder.status
        })
      });

      if (response.ok) {
        const newIncident = await response.json();
        const newWorkOrder: WorkOrder = {
          ...workOrder,
          id: newIncident.id || `WO-${Date.now()}`,
          assignedAt: new Date().toISOString()
        };
        
        setWorkOrders(prev => [newWorkOrder, ...prev]);
        return newWorkOrder;
      } else {
        throw new Error('Failed to create work order');
      }
    } catch (error) {
      console.error('Error creating work order:', error);
      
      // Fallback: create locally
      const newWorkOrder: WorkOrder = {
        ...workOrder,
        id: `WO-${Date.now()}`,
        assignedAt: new Date().toISOString()
      };
      
      setWorkOrders(prev => [newWorkOrder, ...prev]);
      return newWorkOrder;
    }
  };

  // Filter work orders by assigned area
  const filteredWorkOrders = assignedArea 
    ? workOrders.filter(order => order.area === assignedArea.name)
    : workOrders;

  useEffect(() => {
    fetchWorkOrders();
    
    // Set up periodic refresh
    const interval = setInterval(fetchWorkOrders, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [assignedArea]);

  return {
    workOrders: filteredWorkOrders,
    allWorkOrders: workOrders,
    loading,
    error,
    updateWorkOrderStatus,
    createWorkOrder,
    refetch: fetchWorkOrders
  };
}
