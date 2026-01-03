import { randomUUID } from "crypto";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured, type DrizzleClient } from "./db";
import {
  vehicles,
  geofences,
  alerts,
  trips,
  locationPoints,
  routeEvents,
  speedViolations,
  vehicleLocationHistory,
} from "@shared/schema";
import type { 
  Vehicle, InsertVehicle,
  Geofence, InsertGeofence,
  Alert, InsertAlert,
  Trip, SpeedViolation, VehicleStats,
  LocationPoint, RouteEvent, GeofenceRule,
  FleetStats
} from "@shared/schema";

type VehicleUpdateCallback = (vehicles: Vehicle[]) => void;

export interface IStorage {
  getVehicles(): Promise<Vehicle[]>;
  getVehicle(id: string): Promise<Vehicle | undefined>;
  getVehicleByLicensePlate(licensePlate: string): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle | undefined>;
  deleteVehicle(id: string): Promise<boolean>;
  
  getGeofences(): Promise<Geofence[]>;
  getGeofence(id: string): Promise<Geofence | undefined>;
  createGeofence(geofence: InsertGeofence): Promise<Geofence>;
  updateGeofence(id: string, updates: Partial<Geofence>): Promise<Geofence | undefined>;
  deleteGeofence(id: string): Promise<boolean>;
  
  getAlerts(): Promise<Alert[]>;
  getAlert(id: string): Promise<Alert | undefined>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlert(id: string, updates: Partial<Alert>): Promise<Alert | undefined>;
  markAllAlertsRead(): Promise<void>;
  clearReadAlerts(): Promise<void>;
  
  getTrips(vehicleId: string, startDate: string, endDate: string): Promise<Trip[]>;
  
  getSpeedViolations(startDate: string, endDate: string): Promise<SpeedViolation[]>;
  getSpeedStats(startDate: string, endDate: string): Promise<VehicleStats>;
  getFleetStats(startDate: string, endDate: string): Promise<FleetStats>;
  
  // Callback para atualizações de veículos em tempo real
  onVehicleUpdate(callback: VehicleUpdateCallback): () => void;
}

// ============================================
// SUPABASE STORAGE (PostgreSQL via Drizzle)
// ============================================

export class SupabaseStorage implements IStorage {
  private db: DrizzleClient;
  private updateCallbacks: Set<VehicleUpdateCallback> = new Set();
  private simulationInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.db = getDb();
    // Inicia simulação para demonstração (remover em produção)
    this.startSimulation();
  }

  onVehicleUpdate(callback: VehicleUpdateCallback): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  private async notifyVehicleUpdate() {
    const vehiclesList = await this.getVehicles();
    this.updateCallbacks.forEach(cb => cb(vehiclesList));
  }

  private startSimulation() {
    this.simulationInterval = setInterval(async () => {
      try {
        const vehiclesList = await this.getVehicles();
        for (const vehicle of vehiclesList) {
          if (vehicle.status === "moving") {
            const speedChange = (Math.random() - 0.5) * 10;
            const newSpeed = Math.max(0, Math.min(120, vehicle.currentSpeed + speedChange));
            
            const latChange = (Math.random() - 0.5) * 0.002;
            const lngChange = (Math.random() - 0.5) * 0.002;
            
            const headingChange = (Math.random() - 0.5) * 30;
            const newHeading = (vehicle.heading + headingChange + 360) % 360;
            
            await this.updateVehicle(vehicle.id, {
              currentSpeed: Math.round(newSpeed),
              heading: Math.round(newHeading),
              latitude: vehicle.latitude + latChange,
              longitude: vehicle.longitude + lngChange,
              lastUpdate: new Date().toISOString(),
            });
          }
        }
        await this.notifyVehicleUpdate();
      } catch (error) {
        console.error("Erro na simulação:", error);
      }
    }, 3000);
  }

  // ============================================
  // VEHICLES
  // ============================================

  async getVehicles(): Promise<Vehicle[]> {
    const result = await this.db.select().from(vehicles);
    return result.map(this.mapVehicleFromDb);
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    const result = await this.db.select().from(vehicles).where(eq(vehicles.id, id));
    return result[0] ? this.mapVehicleFromDb(result[0]) : undefined;
  }

  async getVehicleByLicensePlate(licensePlate: string): Promise<Vehicle | undefined> {
    const result = await this.db.select().from(vehicles).where(eq(vehicles.licensePlate, licensePlate));
    return result[0] ? this.mapVehicleFromDb(result[0]) : undefined;
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const result = await this.db.insert(vehicles).values({
      name: vehicle.name,
      licensePlate: vehicle.licensePlate,
      model: vehicle.model,
      status: vehicle.status,
      ignition: vehicle.ignition,
      currentSpeed: vehicle.currentSpeed,
      speedLimit: vehicle.speedLimit,
      heading: vehicle.heading,
      latitude: vehicle.latitude,
      longitude: vehicle.longitude,
      accuracy: vehicle.accuracy,
      lastUpdate: new Date(vehicle.lastUpdate),
      batteryLevel: vehicle.batteryLevel,
    }).returning();
    
    await this.notifyVehicleUpdate();
    return this.mapVehicleFromDb(result[0]);
  }

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.licensePlate !== undefined) updateData.licensePlate = updates.licensePlate;
    if (updates.model !== undefined) updateData.model = updates.model;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.ignition !== undefined) updateData.ignition = updates.ignition;
    if (updates.currentSpeed !== undefined) updateData.currentSpeed = updates.currentSpeed;
    if (updates.speedLimit !== undefined) updateData.speedLimit = updates.speedLimit;
    if (updates.heading !== undefined) updateData.heading = updates.heading;
    if (updates.latitude !== undefined) updateData.latitude = updates.latitude;
    if (updates.longitude !== undefined) updateData.longitude = updates.longitude;
    if (updates.accuracy !== undefined) updateData.accuracy = updates.accuracy;
    if (updates.lastUpdate !== undefined) updateData.lastUpdate = new Date(updates.lastUpdate);
    if (updates.batteryLevel !== undefined) updateData.batteryLevel = updates.batteryLevel;

    const result = await this.db.update(vehicles)
      .set(updateData)
      .where(eq(vehicles.id, id))
      .returning();

    if (result.length === 0) return undefined;
    
    const updatedVehicle = this.mapVehicleFromDb(result[0]);
    
    // Salvar histórico de localização se houver mudança de posição
    if (updates.latitude !== undefined || updates.longitude !== undefined) {
      await this.saveLocationHistory(updatedVehicle);
    }
    
    return updatedVehicle;
  }

  // Salva um ponto no histórico de localizações
  private async saveLocationHistory(vehicle: Vehicle): Promise<void> {
    try {
      await this.db.insert(vehicleLocationHistory).values({
        vehicleId: vehicle.id,
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
        speed: vehicle.currentSpeed,
        heading: vehicle.heading,
        status: vehicle.status,
        ignition: vehicle.ignition,
        accuracy: vehicle.accuracy,
        recordedAt: new Date(),
      });
      
      // Detectar violação de velocidade
      if (vehicle.currentSpeed > vehicle.speedLimit) {
        await this.recordSpeedViolation(vehicle);
      }
    } catch (error) {
      console.error("Erro ao salvar histórico de localização:", error);
    }
  }
  
  // Registra uma violação de velocidade
  private async recordSpeedViolation(vehicle: Vehicle): Promise<void> {
    try {
      const excessSpeed = vehicle.currentSpeed - vehicle.speedLimit;
      
      await this.db.insert(speedViolations).values({
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        speed: vehicle.currentSpeed,
        speedLimit: vehicle.speedLimit,
        excessSpeed,
        timestamp: new Date(),
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
        duration: 0, // Será calculado posteriormente se necessário
      });
      
      console.log(`⚠️ Violação de velocidade detectada: ${vehicle.name} - ${vehicle.currentSpeed}/${vehicle.speedLimit} km/h`);
    } catch (error) {
      console.error("Erro ao registrar violação de velocidade:", error);
    }
  }

  async deleteVehicle(id: string): Promise<boolean> {
    const result = await this.db.delete(vehicles).where(eq(vehicles.id, id)).returning();
    if (result.length > 0) {
      await this.notifyVehicleUpdate();
      return true;
    }
    return false;
  }

  private mapVehicleFromDb(row: typeof vehicles.$inferSelect): Vehicle {
    return {
      id: row.id,
      name: row.name,
      licensePlate: row.licensePlate,
      model: row.model ?? undefined,
      status: row.status,
      ignition: row.ignition,
      currentSpeed: row.currentSpeed,
      speedLimit: row.speedLimit,
      heading: row.heading,
      latitude: row.latitude,
      longitude: row.longitude,
      accuracy: row.accuracy,
      lastUpdate: row.lastUpdate.toISOString(),
      batteryLevel: row.batteryLevel ?? undefined,
    };
  }

  // ============================================
  // GEOFENCES
  // ============================================

  async getGeofences(): Promise<Geofence[]> {
    const result = await this.db.select().from(geofences);
    return result.map(this.mapGeofenceFromDb);
  }

  async getGeofence(id: string): Promise<Geofence | undefined> {
    const result = await this.db.select().from(geofences).where(eq(geofences.id, id));
    return result[0] ? this.mapGeofenceFromDb(result[0]) : undefined;
  }

  async createGeofence(geofence: InsertGeofence): Promise<Geofence> {
    const result = await this.db.insert(geofences).values({
      name: geofence.name,
      description: geofence.description,
      type: geofence.type,
      active: geofence.active,
      centerLatitude: geofence.center?.latitude,
      centerLongitude: geofence.center?.longitude,
      radius: geofence.radius,
      points: geofence.points,
      rules: geofence.rules as GeofenceRule[],
      vehicleIds: geofence.vehicleIds,
      lastTriggered: geofence.lastTriggered ? new Date(geofence.lastTriggered) : null,
      color: geofence.color,
    }).returning();

    return this.mapGeofenceFromDb(result[0]);
  }

  async updateGeofence(id: string, updates: Partial<Geofence>): Promise<Geofence | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.active !== undefined) updateData.active = updates.active;
    if (updates.center !== undefined) {
      updateData.centerLatitude = updates.center?.latitude;
      updateData.centerLongitude = updates.center?.longitude;
    }
    if (updates.radius !== undefined) updateData.radius = updates.radius;
    if (updates.points !== undefined) updateData.points = updates.points;
    if (updates.rules !== undefined) updateData.rules = updates.rules;
    if (updates.vehicleIds !== undefined) updateData.vehicleIds = updates.vehicleIds;
    if (updates.lastTriggered !== undefined) updateData.lastTriggered = updates.lastTriggered ? new Date(updates.lastTriggered) : null;
    if (updates.color !== undefined) updateData.color = updates.color;

    const result = await this.db.update(geofences)
      .set(updateData)
      .where(eq(geofences.id, id))
      .returning();

    if (result.length === 0) return undefined;
    return this.mapGeofenceFromDb(result[0]);
  }

  async deleteGeofence(id: string): Promise<boolean> {
    const result = await this.db.delete(geofences).where(eq(geofences.id, id)).returning();
    return result.length > 0;
  }

  private mapGeofenceFromDb(row: typeof geofences.$inferSelect): Geofence {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      type: row.type,
      active: row.active,
      center: row.centerLatitude && row.centerLongitude ? {
        latitude: row.centerLatitude,
        longitude: row.centerLongitude,
      } : undefined,
      radius: row.radius ?? undefined,
      points: row.points ?? undefined,
      rules: (row.rules as GeofenceRule[]) || [],
      vehicleIds: row.vehicleIds || [],
      lastTriggered: row.lastTriggered?.toISOString() ?? undefined,
      color: row.color ?? undefined,
    };
  }

  // ============================================
  // ALERTS
  // ============================================

  async getAlerts(): Promise<Alert[]> {
    const result = await this.db.select().from(alerts).orderBy(desc(alerts.timestamp));
    return result.map(this.mapAlertFromDb);
  }

  async getAlert(id: string): Promise<Alert | undefined> {
    const result = await this.db.select().from(alerts).where(eq(alerts.id, id));
    return result[0] ? this.mapAlertFromDb(result[0]) : undefined;
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const result = await this.db.insert(alerts).values({
      type: alert.type,
      priority: alert.priority,
      vehicleId: alert.vehicleId,
      vehicleName: alert.vehicleName,
      message: alert.message,
      timestamp: new Date(alert.timestamp),
      read: alert.read,
      latitude: alert.latitude,
      longitude: alert.longitude,
      speed: alert.speed,
      speedLimit: alert.speedLimit,
      geofenceName: alert.geofenceName,
    }).returning();

    return this.mapAlertFromDb(result[0]);
  }

  async updateAlert(id: string, updates: Partial<Alert>): Promise<Alert | undefined> {
    const updateData: Record<string, unknown> = {};
    
    if (updates.read !== undefined) updateData.read = updates.read;
    if (updates.message !== undefined) updateData.message = updates.message;

    const result = await this.db.update(alerts)
      .set(updateData)
      .where(eq(alerts.id, id))
      .returning();

    if (result.length === 0) return undefined;
    return this.mapAlertFromDb(result[0]);
  }

  async markAllAlertsRead(): Promise<void> {
    await this.db.update(alerts).set({ read: true });
  }

  async clearReadAlerts(): Promise<void> {
    await this.db.delete(alerts).where(eq(alerts.read, true));
  }

  private mapAlertFromDb(row: typeof alerts.$inferSelect): Alert {
    return {
      id: row.id,
      type: row.type,
      priority: row.priority,
      vehicleId: row.vehicleId,
      vehicleName: row.vehicleName,
      message: row.message,
      timestamp: row.timestamp.toISOString(),
      read: row.read,
      latitude: row.latitude ?? undefined,
      longitude: row.longitude ?? undefined,
      speed: row.speed ?? undefined,
      speedLimit: row.speedLimit ?? undefined,
      geofenceName: row.geofenceName ?? undefined,
    };
  }

  // ============================================
  // TRIPS
  // ============================================

  async getTrips(vehicleId: string, startDate: string, endDate: string): Promise<Trip[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Buscar histórico de localizações do veículo no período
    const historyPoints = await this.db.select()
      .from(vehicleLocationHistory)
      .where(and(
        eq(vehicleLocationHistory.vehicleId, vehicleId),
        gte(vehicleLocationHistory.recordedAt, start),
        lte(vehicleLocationHistory.recordedAt, end)
      ))
      .orderBy(vehicleLocationHistory.recordedAt);

    if (historyPoints.length === 0) {
      return [];
    }

    // Construir viagem a partir dos pontos de histórico
    const trip = this.buildTripFromHistory(vehicleId, historyPoints);
    return trip ? [trip] : [];
  }

  // Constrói uma viagem a partir dos pontos de histórico
  private buildTripFromHistory(
    vehicleId: string, 
    points: (typeof vehicleLocationHistory.$inferSelect)[]
  ): Trip | null {
    if (points.length === 0) return null;

    const locationPoints: LocationPoint[] = points.map(p => ({
      latitude: p.latitude,
      longitude: p.longitude,
      speed: p.speed,
      heading: p.heading,
      timestamp: p.recordedAt.toISOString(),
      accuracy: p.accuracy ?? undefined,
    }));

    // Calcular estatísticas
    const speeds = points.map(p => p.speed);
    const maxSpeed = Math.max(...speeds);
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    
    // Calcular distância total (fórmula de Haversine simplificada)
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += this.calculateDistance(
        points[i - 1].latitude, points[i - 1].longitude,
        points[i].latitude, points[i].longitude
      );
    }

    // Calcular tempo de viagem e tempo parado
    const startTime = points[0].recordedAt;
    const endTime = points[points.length - 1].recordedAt;
    const totalTimeMs = endTime.getTime() - startTime.getTime();
    const totalTimeMinutes = Math.round(totalTimeMs / 60000);
    
    // Contar paradas (quando velocidade = 0 por mais de 1 minuto)
    const stops: { start: number; end: number; lat: number; lng: number }[] = [];
    let stopStart: number | null = null;
    let stopLat = 0;
    let stopLng = 0;
    
    for (let i = 0; i < points.length; i++) {
      if (points[i].speed === 0) {
        if (stopStart === null) {
          stopStart = i;
          stopLat = points[i].latitude;
          stopLng = points[i].longitude;
        }
      } else {
        if (stopStart !== null) {
          const stopDuration = points[i].recordedAt.getTime() - points[stopStart].recordedAt.getTime();
          if (stopDuration > 60000) { // Mais de 1 minuto
            stops.push({ start: stopStart, end: i - 1, lat: stopLat, lng: stopLng });
          }
          stopStart = null;
        }
      }
    }

    // Calcular tempo parado total
    let stoppedTimeMs = 0;
    for (const stop of stops) {
      stoppedTimeMs += points[stop.end].recordedAt.getTime() - points[stop.start].recordedAt.getTime();
    }
    const stoppedTimeMinutes = Math.round(stoppedTimeMs / 60000);
    const travelTimeMinutes = totalTimeMinutes - stoppedTimeMinutes;

    // Gerar eventos
    const events: RouteEvent[] = [];
    
    // Evento de partida
    events.push({
      id: `dep-${vehicleId}-${startTime.getTime()}`,
      type: "departure",
      latitude: points[0].latitude,
      longitude: points[0].longitude,
      timestamp: startTime.toISOString(),
      duration: undefined,
      speed: points[0].speed,
      speedLimit: undefined,
      geofenceName: undefined,
      address: undefined,
    });

    // Eventos de parada
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      const duration = Math.round(
        (points[stop.end].recordedAt.getTime() - points[stop.start].recordedAt.getTime()) / 60000
      );
      events.push({
        id: `stop-${vehicleId}-${i}`,
        type: "stop",
        latitude: stop.lat,
        longitude: stop.lng,
        timestamp: points[stop.start].recordedAt.toISOString(),
        duration,
        speed: 0,
        speedLimit: undefined,
        geofenceName: undefined,
        address: undefined,
      });
    }

    // Evento de chegada
    events.push({
      id: `arr-${vehicleId}-${endTime.getTime()}`,
      type: "arrival",
      latitude: points[points.length - 1].latitude,
      longitude: points[points.length - 1].longitude,
      timestamp: endTime.toISOString(),
      duration: undefined,
      speed: points[points.length - 1].speed,
      speedLimit: undefined,
      geofenceName: undefined,
      address: undefined,
    });

    return {
      id: `trip-${vehicleId}-${startTime.getTime()}`,
      vehicleId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      totalDistance: Math.round(totalDistance),
      travelTime: travelTimeMinutes,
      stoppedTime: stoppedTimeMinutes,
      averageSpeed: Math.round(avgSpeed),
      maxSpeed: Math.round(maxSpeed),
      stopsCount: stops.length,
      points: locationPoints,
      events,
    };
  }

  // Calcula distância entre dois pontos em metros (Haversine)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Raio da Terra em metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // ============================================
  // SPEED VIOLATIONS
  // ============================================

  async getSpeedViolations(startDate: string, endDate: string): Promise<SpeedViolation[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const result = await this.db.select().from(speedViolations)
      .where(and(
        gte(speedViolations.timestamp, start),
        lte(speedViolations.timestamp, end)
      ))
      .orderBy(desc(speedViolations.timestamp));

    return result.map(v => ({
      id: v.id,
      vehicleId: v.vehicleId,
      vehicleName: v.vehicleName,
      speed: v.speed,
      speedLimit: v.speedLimit,
      excessSpeed: v.excessSpeed,
      timestamp: v.timestamp.toISOString(),
      latitude: v.latitude,
      longitude: v.longitude,
      duration: v.duration,
    }));
  }

  async getSpeedStats(startDate: string, endDate: string): Promise<VehicleStats> {
    const violations = await this.getSpeedViolations(startDate, endDate);

    const byVehicle = new Map<string, { count: number; totalExcess: number; lastViolation: string; name: string }>();

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
      const day = v.timestamp.split("T")[0];
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

  async getFleetStats(startDate: string, endDate: string): Promise<FleetStats> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Total de veículos cadastrados
    const allVehicles = await this.getVehicles();
    const totalVehicles = allVehicles.length;

    // Buscar histórico de todos os veículos no período
    const historyData = await this.db.select()
      .from(vehicleLocationHistory)
      .where(and(
        gte(vehicleLocationHistory.recordedAt, start),
        lte(vehicleLocationHistory.recordedAt, end)
      ));

    if (historyData.length === 0) {
      return {
        totalVehicles,
        averageSpeed: 0,
        totalDistance: 0,
        mostActiveVehicle: null,
      };
    }

    // Calcular velocidade média de todos os veículos
    const speeds = historyData.map(h => h.speed);
    const averageSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;

    // Calcular distância por veículo
    const vehicleDistances = new Map<string, { name: string; distance: number; speeds: number[] }>();

    for (const vehicle of allVehicles) {
      const vehicleHistory = historyData
        .filter(h => h.vehicleId === vehicle.id)
        .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());

      if (vehicleHistory.length > 0) {
        let distance = 0;
        const vehicleSpeeds: number[] = [];

        for (let i = 1; i < vehicleHistory.length; i++) {
          distance += this.calculateDistance(
            vehicleHistory[i - 1].latitude,
            vehicleHistory[i - 1].longitude,
            vehicleHistory[i].latitude,
            vehicleHistory[i].longitude
          );
          vehicleSpeeds.push(vehicleHistory[i].speed);
        }

        vehicleDistances.set(vehicle.id, {
          name: vehicle.name,
          distance,
          speeds: vehicleSpeeds,
        });
      }
    }

    // Encontrar veículo mais ativo (maior distância)
    let mostActiveVehicle = null;
    let maxDistance = 0;

    for (const [id, data] of vehicleDistances.entries()) {
      if (data.distance > maxDistance) {
        maxDistance = data.distance;
        const avgSpeed = data.speeds.length > 0
          ? data.speeds.reduce((a: number, b: number) => a + b, 0) / data.speeds.length
          : 0;
        mostActiveVehicle = {
          id,
          name: data.name,
          distance: Math.round(data.distance),
          avgSpeed: Math.round(avgSpeed),
        };
      }
    }

    const totalDistance = Array.from(vehicleDistances.values())
      .reduce((sum, v) => sum + v.distance, 0);

    return {
      totalVehicles,
      averageSpeed: Math.round(averageSpeed),
      totalDistance: Math.round(totalDistance),
      mostActiveVehicle,
    };
  }
}

// ============================================
// MEM STORAGE (Fallback para desenvolvimento)
// ============================================

const sampleVehicles: Vehicle[] = [
  {
    id: "v1",
    name: "🚛 Caminhão 01",
    licensePlate: "ABC-1234",
    model: "Mercedes Actros",
    status: "moving",
    ignition: "on",
    currentSpeed: 72,
    speedLimit: 80,
    heading: 45,
    latitude: -23.5489,
    longitude: -46.6388,
    accuracy: 5,
    lastUpdate: new Date().toISOString(),
    batteryLevel: 85,
  },
  {
    id: "v2",
    name: "🚐 Van 02",
    licensePlate: "DEF-5678",
    model: "Fiat Ducato",
    status: "moving",
    ignition: "on",
    currentSpeed: 95,
    speedLimit: 60,
    heading: 180,
    latitude: -23.5605,
    longitude: -46.6533,
    accuracy: 3,
    lastUpdate: new Date().toISOString(),
    batteryLevel: 92,
  },
  {
    id: "v3",
    name: "🚛 Caminhão 03",
    licensePlate: "GHI-9012",
    model: "Volvo FH",
    status: "stopped",
    ignition: "off",
    currentSpeed: 0,
    speedLimit: 80,
    heading: 0,
    latitude: -23.5305,
    longitude: -46.6233,
    accuracy: 4,
    lastUpdate: new Date(Date.now() - 300000).toISOString(),
    batteryLevel: 78,
  },
  {
    id: "v4",
    name: "🚐 Van 04",
    licensePlate: "JKL-3456",
    model: "Renault Master",
    status: "moving",
    ignition: "on",
    currentSpeed: 55,
    speedLimit: 60,
    heading: 270,
    latitude: -23.5705,
    longitude: -46.6433,
    accuracy: 6,
    lastUpdate: new Date().toISOString(),
    batteryLevel: 67,
  },
  {
    id: "v5",
    name: "🚛 Caminhão PoloTelecom",
    licensePlate: "MNO-7890",
    model: "Scania R450",
    status: "idle",
    ignition: "on",
    currentSpeed: 0,
    speedLimit: 80,
    heading: 90,
    latitude: -23.5405,
    longitude: -46.6133,
    accuracy: 4,
    lastUpdate: new Date(Date.now() - 120000).toISOString(),
    batteryLevel: 91,
  },
  {
    id: "v6",
    name: "🚐 Van 06",
    licensePlate: "PQR-1234",
    model: "VW Delivery",
    status: "offline",
    ignition: "off",
    currentSpeed: 0,
    speedLimit: 60,
    heading: 0,
    latitude: -23.5205,
    longitude: -46.6733,
    accuracy: 10,
    lastUpdate: new Date(Date.now() - 3600000).toISOString(),
    batteryLevel: 45,
  },
];

const sampleGeofences: Geofence[] = [
  {
    id: "g1",
    name: "Depósito Central",
    description: "Área principal de carga e descarga",
    type: "circle",
    active: true,
    center: { latitude: -23.5505, longitude: -46.6333 },
    radius: 500,
    rules: [
      { type: "entry", enabled: true, toleranceSeconds: 30 },
      { type: "exit", enabled: true, toleranceSeconds: 30 },
      { type: "dwell", enabled: true, dwellTimeMinutes: 60, toleranceSeconds: 30 },
    ],
    vehicleIds: ["v1", "v2", "v3", "v4", "v5"],
    lastTriggered: new Date(Date.now() - 3600000).toISOString(),
    color: "#22c55e",
  },
  {
    id: "g2",
    name: "Zona de Entrega Norte",
    description: "Região de entregas no setor norte",
    type: "polygon",
    active: true,
    points: [
      { latitude: -23.5200, longitude: -46.6400 },
      { latitude: -23.5200, longitude: -46.6200 },
      { latitude: -23.5350, longitude: -46.6200 },
      { latitude: -23.5350, longitude: -46.6400 },
    ],
    rules: [
      { type: "entry", enabled: true, toleranceSeconds: 60 },
      { type: "exit", enabled: true, toleranceSeconds: 60 },
    ],
    vehicleIds: ["v1", "v3", "v5"],
    color: "#3b82f6",
  },
  {
    id: "g3",
    name: "Área Restrita",
    description: "Zona de acesso proibido",
    type: "circle",
    active: true,
    center: { latitude: -23.5800, longitude: -46.6600 },
    radius: 300,
    rules: [
      { type: "entry", enabled: true, toleranceSeconds: 10 },
    ],
    vehicleIds: ["v1", "v2", "v3", "v4", "v5", "v6"],
    color: "#ef4444",
  },
];

const sampleAlerts: Alert[] = [
  {
    id: "a1",
    type: "speed",
    priority: "critical",
    vehicleId: "v2",
    vehicleName: "Van 02",
    message: "Velocidade acima do limite: 95 km/h em zona de 60 km/h",
    timestamp: new Date().toISOString(),
    read: false,
    latitude: -23.5605,
    longitude: -46.6533,
    speed: 95,
    speedLimit: 60,
  },
  {
    id: "a2",
    type: "geofence_entry",
    priority: "info",
    vehicleId: "v1",
    vehicleName: "Caminhão 01",
    message: "Entrada na área 'Depósito Central'",
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    read: false,
    latitude: -23.5505,
    longitude: -46.6333,
    geofenceName: "Depósito Central",
  },
  {
    id: "a3",
    type: "speed",
    priority: "warning",
    vehicleId: "v4",
    vehicleName: "Van 04",
    message: "Velocidade próxima ao limite: 55 km/h em zona de 60 km/h",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    read: true,
    latitude: -23.5705,
    longitude: -46.6433,
    speed: 55,
    speedLimit: 60,
  },
  {
    id: "a4",
    type: "geofence_exit",
    priority: "warning",
    vehicleId: "v3",
    vehicleName: "Caminhão 03",
    message: "Saída da área 'Zona de Entrega Norte'",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    read: true,
    latitude: -23.5350,
    longitude: -46.6400,
    geofenceName: "Zona de Entrega Norte",
  },
  {
    id: "a5",
    type: "system",
    priority: "info",
    vehicleId: "v6",
    vehicleName: "Van 06",
    message: "Veículo offline há mais de 1 hora",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    read: false,
  },
];

function generateSampleTrip(vehicleId: string, startDate: string, endDate: string): Trip {
  const vehicle = sampleVehicles.find(v => v.id === vehicleId);
  const start = new Date(startDate);
  
  const baseLat = -23.5505;
  const baseLng = -46.6333;
  
  const points: Trip["points"] = [];
  const events: Trip["events"] = [];
  
  let currentTime = new Date(start);
  currentTime.setHours(8, 0, 0, 0);
  const tripEnd = new Date(start);
  tripEnd.setHours(17, 0, 0, 0);
  
  let lat = baseLat;
  let lng = baseLng;
  let totalDistance = 0;
  let stoppedTime = 0;
  let maxSpeed = 0;
  let totalSpeed = 0;
  let speedCount = 0;
  
  events.push({
    id: randomUUID(),
    type: "departure",
    latitude: lat,
    longitude: lng,
    timestamp: currentTime.toISOString(),
    address: "Rua Augusta, 1234 - Consolação, São Paulo",
  });
  
  while (currentTime < tripEnd) {
    const speed = 30 + Math.random() * 50;
    const heading = Math.random() * 360;
    
    lat += (Math.random() - 0.5) * 0.01;
    lng += (Math.random() - 0.5) * 0.01;
    
    points.push({
      latitude: lat,
      longitude: lng,
      speed: Math.round(speed),
      heading: Math.round(heading),
      timestamp: currentTime.toISOString(),
      accuracy: 3 + Math.random() * 5,
    });
    
    totalDistance += speed * (5 / 60);
    if (speed > maxSpeed) maxSpeed = speed;
    totalSpeed += speed;
    speedCount++;
    
    if (Math.random() < 0.02 && speed > 65) {
      events.push({
        id: randomUUID(),
        type: "speed_violation",
        latitude: lat,
        longitude: lng,
        timestamp: currentTime.toISOString(),
        speed: Math.round(speed),
        speedLimit: 60,
      });
    }
    
    if (Math.random() < 0.01) {
      const stopDuration = 5 + Math.random() * 25;
      stoppedTime += stopDuration;
      events.push({
        id: randomUUID(),
        type: "stop",
        latitude: lat,
        longitude: lng,
        timestamp: currentTime.toISOString(),
        duration: stopDuration,
        address: `Rua ${Math.floor(Math.random() * 1000)}, São Paulo`,
      });
    }
    
    currentTime = new Date(currentTime.getTime() + 5 * 60 * 1000);
  }
  
  events.push({
    id: randomUUID(),
    type: "arrival",
    latitude: lat,
    longitude: lng,
    timestamp: currentTime.toISOString(),
    address: "Av. Paulista, 1000 - Bela Vista, São Paulo",
  });
  
  return {
    id: randomUUID(),
    vehicleId,
    startTime: new Date(start.setHours(8, 0, 0, 0)).toISOString(),
    endTime: currentTime.toISOString(),
    totalDistance: Math.round(totalDistance * 1000),
    travelTime: (tripEnd.getTime() - new Date(start.setHours(8, 0, 0, 0)).getTime()) / 60000 - stoppedTime,
    stoppedTime: Math.round(stoppedTime),
    averageSpeed: Math.round(totalSpeed / speedCount),
    maxSpeed: Math.round(maxSpeed),
    stopsCount: events.filter(e => e.type === "stop").length,
    points,
    events: events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
  };
}

function generateSpeedViolations(startDate: string, endDate: string): SpeedViolation[] {
  const violations: SpeedViolation[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dailyViolations = 5 + Math.floor(Math.random() * 12);
    
    for (let i = 0; i < dailyViolations; i++) {
      const vehicle = sampleVehicles[Math.floor(Math.random() * sampleVehicles.length)];
      const speed = vehicle.speedLimit + 8 + Math.floor(Math.random() * 35);
      
      violations.push({
        id: randomUUID(),
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        speed,
        speedLimit: vehicle.speedLimit,
        excessSpeed: speed - vehicle.speedLimit,
        timestamp: new Date(d.getTime() + Math.random() * 86400000).toISOString(),
        latitude: -23.5 + Math.random() * 0.1,
        longitude: -46.6 + Math.random() * 0.1,
        duration: 15 + Math.floor(Math.random() * 90),
      });
    }
  }
  
  return violations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function generateSpeedStats(startDate: string, endDate: string): VehicleStats {
  const violations = generateSpeedViolations(startDate, endDate);
  
  const byVehicle = new Map<string, { count: number; totalExcess: number; lastViolation: string; name: string }>();
  
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
    const day = v.timestamp.split("T")[0];
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

export class MemStorage implements IStorage {
  private vehicles: Map<string, Vehicle>;
  private geofences: Map<string, Geofence>;
  private alerts: Map<string, Alert>;
  private simulationInterval: ReturnType<typeof setInterval> | null = null;
  private updateCallbacks: Set<VehicleUpdateCallback> = new Set();

  constructor() {
    this.vehicles = new Map(sampleVehicles.map(v => [v.id, v]));
    this.geofences = new Map(sampleGeofences.map(g => [g.id, g]));
    this.alerts = new Map(sampleAlerts.map(a => [a.id, a]));
    
    this.startSimulation();
  }

  onVehicleUpdate(callback: VehicleUpdateCallback): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  private notifyVehicleUpdate() {
    const vehicles = Array.from(this.vehicles.values());
    this.updateCallbacks.forEach(cb => cb(vehicles));
  }

  private startSimulation() {
    this.simulationInterval = setInterval(() => {
      this.vehicles.forEach((vehicle, id) => {
        if (vehicle.status === "moving") {
          const speedChange = (Math.random() - 0.5) * 10;
          let newSpeed = Math.max(0, Math.min(120, vehicle.currentSpeed + speedChange));
          
          const latChange = (Math.random() - 0.5) * 0.002;
          const lngChange = (Math.random() - 0.5) * 0.002;
          
          const headingChange = (Math.random() - 0.5) * 30;
          let newHeading = (vehicle.heading + headingChange + 360) % 360;
          
          this.vehicles.set(id, {
            ...vehicle,
            currentSpeed: Math.round(newSpeed),
            heading: Math.round(newHeading),
            latitude: vehicle.latitude + latChange,
            longitude: vehicle.longitude + lngChange,
            lastUpdate: new Date().toISOString(),
          });
        }
      });
      this.notifyVehicleUpdate();
    }, 3000);
  }

  async getVehicles(): Promise<Vehicle[]> {
    return Array.from(this.vehicles.values());
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    return this.vehicles.get(id);
  }

  async getVehicleByLicensePlate(licensePlate: string): Promise<Vehicle | undefined> {
    return Array.from(this.vehicles.values()).find(
      (v) => v.licensePlate.toLowerCase() === licensePlate.toLowerCase(),
    );
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const id = randomUUID();
    const newVehicle: Vehicle = { ...vehicle, id };
    this.vehicles.set(id, newVehicle);
    this.notifyVehicleUpdate();
    return newVehicle;
  }

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle | undefined> {
    const vehicle = this.vehicles.get(id);
    if (!vehicle) return undefined;
    
    const updated = { ...vehicle, ...updates };
    this.vehicles.set(id, updated);
    this.notifyVehicleUpdate();
    return updated;
  }

  async deleteVehicle(id: string): Promise<boolean> {
    const result = this.vehicles.delete(id);
    if (result) this.notifyVehicleUpdate();
    return result;
  }

  async getGeofences(): Promise<Geofence[]> {
    return Array.from(this.geofences.values());
  }

  async getGeofence(id: string): Promise<Geofence | undefined> {
    return this.geofences.get(id);
  }

  async createGeofence(geofence: InsertGeofence): Promise<Geofence> {
    const id = randomUUID();
    const newGeofence: Geofence = { ...geofence, id };
    this.geofences.set(id, newGeofence);
    return newGeofence;
  }

  async updateGeofence(id: string, updates: Partial<Geofence>): Promise<Geofence | undefined> {
    const geofence = this.geofences.get(id);
    if (!geofence) return undefined;
    
    const updated = { ...geofence, ...updates };
    this.geofences.set(id, updated);
    return updated;
  }

  async deleteGeofence(id: string): Promise<boolean> {
    return this.geofences.delete(id);
  }

  async getAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getAlert(id: string): Promise<Alert | undefined> {
    return this.alerts.get(id);
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const id = randomUUID();
    const newAlert: Alert = { ...alert, id };
    this.alerts.set(id, newAlert);
    return newAlert;
  }

  async updateAlert(id: string, updates: Partial<Alert>): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;
    
    const updated = { ...alert, ...updates };
    this.alerts.set(id, updated);
    return updated;
  }

  async markAllAlertsRead(): Promise<void> {
    this.alerts.forEach((alert, id) => {
      this.alerts.set(id, { ...alert, read: true });
    });
  }

  async clearReadAlerts(): Promise<void> {
    this.alerts.forEach((alert, id) => {
      if (alert.read) {
        this.alerts.delete(id);
      }
    });
  }

  async getTrips(vehicleId: string, startDate: string, endDate: string): Promise<Trip[]> {
    return [generateSampleTrip(vehicleId, startDate, endDate)];
  }

  async getSpeedViolations(startDate: string, endDate: string): Promise<SpeedViolation[]> {
    return generateSpeedViolations(startDate, endDate);
  }

  async getSpeedStats(startDate: string, endDate: string): Promise<VehicleStats> {
    return generateSpeedStats(startDate, endDate);
  }

  async getFleetStats(startDate: string, endDate: string): Promise<FleetStats> {
    return {
      totalVehicles: this.vehicles.size,
      averageSpeed: 65,
      totalDistance: 15000,
      mostActiveVehicle: {
        id: "v1",
        name: "🚛 Caminhão 01",
        distance: 5000,
        avgSpeed: 72,
      },
    };
  }
}


// Exporta SupabaseStorage se configurado, senão MemStorage para desenvolvimento
async function createStorage(): Promise<IStorage> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // #region agent log - H1: Verificar variáveis de ambiente
  console.log('[DEBUG H1] Environment check:', { hasSupabaseUrl: !!supabaseUrl, hasSupabaseKey: !!supabaseKey, supabaseUrlPrefix: supabaseUrl?.substring(0, 30) });
  // #endregion

  if (supabaseUrl && supabaseKey) {
    console.log("🚀 Using Supabase storage");
    // #region agent log - H4: Confirmar uso do SupabaseStorage
    console.log('[DEBUG H4] Using SupabaseStorage');
    // #endregion
    // Dynamic import para evitar erro quando Supabase não está configurado
    const { SupabaseStorage } = await import("./supabase-storage");
    return new SupabaseStorage();
  }

  console.log("📦 Using in-memory storage (Supabase not configurado)");
  // #region agent log - H4: Usando MemStorage
  console.log('[DEBUG H4] Using MemStorage - Supabase not configured');
  // #endregion
  return new MemStorage();
}

// Inicializa o storage de forma assíncrona
let storage: IStorage;

const initPromise = createStorage().then((s) => {
  storage = s;
});

export { storage, initPromise };
