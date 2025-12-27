import { supabaseAdmin } from './lib/supabase';
import type { 
  Vehicle, InsertVehicle,
  Geofence, InsertGeofence,
  Alert, InsertAlert,
  Trip, SpeedViolation, VehicleStats,
  LocationPoint, RouteEvent
} from '@shared/schema';
import type { IStorage } from './storage';

// Helpers para converter entre formato do banco (snake_case) e aplicação (camelCase)
function toVehicle(row: any): Vehicle {
  return {
    id: row.id,
    name: row.name,
    licensePlate: row.license_plate,
    model: row.model,
    status: row.status,
    ignition: row.ignition,
    currentSpeed: row.current_speed,
    speedLimit: row.speed_limit,
    heading: row.heading,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: row.accuracy,
    lastUpdate: row.last_update,
    batteryLevel: row.battery_level,
  };
}

function toVehicleRow(vehicle: InsertVehicle | Partial<Vehicle>): any {
  const row: any = {};
  if ('name' in vehicle && vehicle.name !== undefined) row.name = vehicle.name;
  if ('licensePlate' in vehicle && vehicle.licensePlate !== undefined) row.license_plate = vehicle.licensePlate;
  if ('model' in vehicle) row.model = vehicle.model;
  if ('status' in vehicle && vehicle.status !== undefined) row.status = vehicle.status;
  if ('ignition' in vehicle && vehicle.ignition !== undefined) row.ignition = vehicle.ignition;
  if ('currentSpeed' in vehicle && vehicle.currentSpeed !== undefined) row.current_speed = vehicle.currentSpeed;
  if ('speedLimit' in vehicle && vehicle.speedLimit !== undefined) row.speed_limit = vehicle.speedLimit;
  if ('heading' in vehicle && vehicle.heading !== undefined) row.heading = vehicle.heading;
  if ('latitude' in vehicle && vehicle.latitude !== undefined) row.latitude = vehicle.latitude;
  if ('longitude' in vehicle && vehicle.longitude !== undefined) row.longitude = vehicle.longitude;
  if ('accuracy' in vehicle && vehicle.accuracy !== undefined) row.accuracy = vehicle.accuracy;
  if ('lastUpdate' in vehicle && vehicle.lastUpdate !== undefined) row.last_update = vehicle.lastUpdate;
  if ('batteryLevel' in vehicle) row.battery_level = vehicle.batteryLevel;
  return row;
}

function toGeofence(row: any): Geofence {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    active: row.active,
    center: row.center,
    radius: row.radius,
    points: row.points,
    rules: row.rules || [],
    vehicleIds: row.vehicle_ids || [],
    lastTriggered: row.last_triggered,
    color: row.color,
  };
}

function toGeofenceRow(geofence: InsertGeofence | Partial<Geofence>): any {
  const row: any = {};
  if ('name' in geofence && geofence.name !== undefined) row.name = geofence.name;
  if ('description' in geofence) row.description = geofence.description;
  if ('type' in geofence && geofence.type !== undefined) row.type = geofence.type;
  if ('active' in geofence && geofence.active !== undefined) row.active = geofence.active;
  if ('center' in geofence) row.center = geofence.center;
  if ('radius' in geofence) row.radius = geofence.radius;
  if ('points' in geofence) row.points = geofence.points;
  if ('rules' in geofence && geofence.rules !== undefined) row.rules = geofence.rules;
  if ('vehicleIds' in geofence && geofence.vehicleIds !== undefined) row.vehicle_ids = geofence.vehicleIds;
  if ('lastTriggered' in geofence) row.last_triggered = geofence.lastTriggered;
  if ('color' in geofence) row.color = geofence.color;
  return row;
}

function toAlert(row: any): Alert {
  return {
    id: row.id,
    type: row.type,
    priority: row.priority,
    vehicleId: row.vehicle_id,
    vehicleName: row.vehicle_name,
    message: row.message,
    timestamp: row.timestamp,
    read: row.read,
    latitude: row.latitude,
    longitude: row.longitude,
    speed: row.speed,
    speedLimit: row.speed_limit,
    geofenceName: row.geofence_name,
  };
}

function toAlertRow(alert: InsertAlert | Partial<Alert>): any {
  const row: any = {};
  if ('type' in alert && alert.type !== undefined) row.type = alert.type;
  if ('priority' in alert && alert.priority !== undefined) row.priority = alert.priority;
  if ('vehicleId' in alert && alert.vehicleId !== undefined) row.vehicle_id = alert.vehicleId;
  if ('vehicleName' in alert && alert.vehicleName !== undefined) row.vehicle_name = alert.vehicleName;
  if ('message' in alert && alert.message !== undefined) row.message = alert.message;
  if ('timestamp' in alert && alert.timestamp !== undefined) row.timestamp = alert.timestamp;
  if ('read' in alert && alert.read !== undefined) row.read = alert.read;
  if ('latitude' in alert) row.latitude = alert.latitude;
  if ('longitude' in alert) row.longitude = alert.longitude;
  if ('speed' in alert) row.speed = alert.speed;
  if ('speedLimit' in alert) row.speed_limit = alert.speedLimit;
  if ('geofenceName' in alert) row.geofence_name = alert.geofenceName;
  return row;
}

function toTrip(row: any): Trip {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    startTime: row.start_time,
    endTime: row.end_time,
    totalDistance: row.total_distance,
    travelTime: row.travel_time,
    stoppedTime: row.stopped_time,
    averageSpeed: row.average_speed,
    maxSpeed: row.max_speed,
    stopsCount: row.stops_count,
    points: row.points as LocationPoint[],
    events: row.events as RouteEvent[],
  };
}

function toSpeedViolation(row: any): SpeedViolation {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    vehicleName: row.vehicle_name,
    speed: row.speed,
    speedLimit: row.speed_limit,
    excessSpeed: row.excess_speed,
    timestamp: row.timestamp,
    latitude: row.latitude,
    longitude: row.longitude,
    duration: row.duration,
  };
}

export class SupabaseStorage implements IStorage {
  // Vehicles
  async getVehicles(): Promise<Vehicle[]> {
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return (data || []).map(toVehicle);
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    return data ? toVehicle(data) : undefined;
  }

  async getVehicleByLicensePlate(licensePlate: string): Promise<Vehicle | undefined> {
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .select('*')
      .ilike('license_plate', licensePlate)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    return data ? toVehicle(data) : undefined;
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const row = toVehicleRow(vehicle);
    row.last_update = new Date().toISOString();
    
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .insert(row)
      .select()
      .single();
    
    if (error) throw error;
    return toVehicle(data);
  }

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle | undefined> {
    const row = toVehicleRow(updates);
    row.updated_at = new Date().toISOString();
    
    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    return data ? toVehicle(data) : undefined;
  }

  async deleteVehicle(id: string): Promise<boolean> {
    const { error, count } = await supabaseAdmin
      .from('vehicles')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  // Geofences
  async getGeofences(): Promise<Geofence[]> {
    const { data, error } = await supabaseAdmin
      .from('geofences')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return (data || []).map(toGeofence);
  }

  async getGeofence(id: string): Promise<Geofence | undefined> {
    const { data, error } = await supabaseAdmin
      .from('geofences')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    return data ? toGeofence(data) : undefined;
  }

  async createGeofence(geofence: InsertGeofence): Promise<Geofence> {
    const row = toGeofenceRow(geofence);
    
    const { data, error } = await supabaseAdmin
      .from('geofences')
      .insert(row)
      .select()
      .single();
    
    if (error) throw error;
    return toGeofence(data);
  }

  async updateGeofence(id: string, updates: Partial<Geofence>): Promise<Geofence | undefined> {
    const row = toGeofenceRow(updates);
    row.updated_at = new Date().toISOString();
    
    const { data, error } = await supabaseAdmin
      .from('geofences')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    return data ? toGeofence(data) : undefined;
  }

  async deleteGeofence(id: string): Promise<boolean> {
    const { error, count } = await supabaseAdmin
      .from('geofences')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  // Alerts
  async getAlerts(): Promise<Alert[]> {
    const { data, error } = await supabaseAdmin
      .from('alerts')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(toAlert);
  }

  async getAlert(id: string): Promise<Alert | undefined> {
    const { data, error } = await supabaseAdmin
      .from('alerts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    return data ? toAlert(data) : undefined;
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const row = toAlertRow(alert);
    if (!row.timestamp) row.timestamp = new Date().toISOString();
    
    const { data, error } = await supabaseAdmin
      .from('alerts')
      .insert(row)
      .select()
      .single();
    
    if (error) throw error;
    return toAlert(data);
  }

  async updateAlert(id: string, updates: Partial<Alert>): Promise<Alert | undefined> {
    const row = toAlertRow(updates);
    
    const { data, error } = await supabaseAdmin
      .from('alerts')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    return data ? toAlert(data) : undefined;
  }

  async markAllAlertsRead(): Promise<void> {
    const { error } = await supabaseAdmin
      .from('alerts')
      .update({ read: true })
      .eq('read', false);
    
    if (error) throw error;
  }

  async clearReadAlerts(): Promise<void> {
    const { error } = await supabaseAdmin
      .from('alerts')
      .delete()
      .eq('read', true);
    
    if (error) throw error;
  }

  // Trips
  async getTrips(vehicleId: string, startDate: string, endDate: string): Promise<Trip[]> {
    const { data, error } = await supabaseAdmin
      .from('trips')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .gte('start_time', startDate)
      .lte('end_time', endDate)
      .order('start_time', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(toTrip);
  }

  // Speed Violations
  async getSpeedViolations(startDate: string, endDate: string): Promise<SpeedViolation[]> {
    const { data, error } = await supabaseAdmin
      .from('speed_violations')
      .select('*')
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(toSpeedViolation);
  }

  async getSpeedStats(startDate: string, endDate: string): Promise<VehicleStats> {
    const violations = await this.getSpeedViolations(startDate, endDate);
    
    const byVehicle = new Map<string, { 
      count: number; 
      totalExcess: number; 
      lastViolation: string; 
      name: string 
    }>();
    
    violations.forEach(v => {
      const existing = byVehicle.get(v.vehicleId);
      if (existing) {
        existing.count++;
        existing.totalExcess += v.excessSpeed;
        if (new Date(v.timestamp) > new Date(existing.lastViolation)) {
          existing.lastViolation = v.timestamp;
        }
      } else {
        byVehicle.set(v.vehicleId, {
          count: 1,
          totalExcess: v.excessSpeed,
          lastViolation: v.timestamp,
          name: v.vehicleName,
        });
      }
    });
    
    const byDay = new Map<string, number>();
    violations.forEach(v => {
      const day = v.timestamp.split('T')[0];
      byDay.set(day, (byDay.get(day) || 0) + 1);
    });
    
    const topViolators = Array.from(byVehicle.entries())
      .map(([vehicleId, data]) => ({
        vehicleId,
        vehicleName: data.name,
        totalViolations: data.count,
        averageExcessSpeed: data.totalExcess / data.count,
        lastViolation: data.lastViolation,
      }))
      .sort((a, b) => b.totalViolations - a.totalViolations)
      .slice(0, 10);
    
    return {
      totalViolations: violations.length,
      vehiclesWithViolations: byVehicle.size,
      averageExcessSpeed: violations.length > 0 
        ? violations.reduce((sum, v) => sum + v.excessSpeed, 0) / violations.length 
        : 0,
      violationsByDay: Array.from(byDay.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topViolators,
    };
  }
}
