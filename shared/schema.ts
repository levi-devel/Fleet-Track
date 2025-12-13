import { z } from "zod";
import { pgTable, text, integer, boolean, real, timestamp, uuid, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// ============================================
// ENUMS
// ============================================

export const vehicleStatusEnum = pgEnum("vehicle_status", ["moving", "stopped", "idle", "offline"]);
export const ignitionStatusEnum = pgEnum("ignition_status", ["on", "off"]);
export const alertTypeEnum = pgEnum("alert_type", ["speed", "geofence_entry", "geofence_exit", "geofence_dwell", "system"]);
export const alertPriorityEnum = pgEnum("alert_priority", ["critical", "warning", "info"]);
export const geofenceTypeEnum = pgEnum("geofence_type", ["circle", "polygon"]);
export const routeEventTypeEnum = pgEnum("route_event_type", ["departure", "arrival", "stop", "speed_violation", "geofence_entry", "geofence_exit"]);

// TypeScript types from enums
export type VehicleStatus = "moving" | "stopped" | "idle" | "offline";
export type IgnitionStatus = "on" | "off";
export type AlertType = "speed" | "geofence_entry" | "geofence_exit" | "geofence_dwell" | "system";
export type AlertPriority = "critical" | "warning" | "info";
export type GeofenceType = "circle" | "polygon";
export type GeofenceRuleType = "entry" | "exit" | "dwell" | "time_violation";

// ============================================
// TABELAS - DRIZZLE SCHEMA
// ============================================

// Tabela: vehicles
export const vehicles = pgTable("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  licensePlate: text("license_plate").notNull(),
  model: text("model"),
  status: vehicleStatusEnum("status").notNull().default("offline"),
  ignition: ignitionStatusEnum("ignition").notNull().default("off"),
  currentSpeed: integer("current_speed").notNull().default(0),
  speedLimit: integer("speed_limit").notNull().default(80),
  heading: integer("heading").notNull().default(0),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  accuracy: real("accuracy").notNull().default(5),
  lastUpdate: timestamp("last_update", { withTimezone: true }).notNull().defaultNow(),
  batteryLevel: integer("battery_level"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Tabela: geofences
export const geofences = pgTable("geofences", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  type: geofenceTypeEnum("type").notNull(),
  active: boolean("active").notNull().default(true),
  centerLatitude: real("center_latitude"),
  centerLongitude: real("center_longitude"),
  radius: real("radius"),
  points: jsonb("points").$type<{ latitude: number; longitude: number }[]>(),
  rules: jsonb("rules").$type<GeofenceRule[]>().notNull().default([]),
  vehicleIds: text("vehicle_ids").array().notNull().default([]),
  lastTriggered: timestamp("last_triggered", { withTimezone: true }),
  color: text("color"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Tabela: alerts
export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: alertTypeEnum("type").notNull(),
  priority: alertPriorityEnum("priority").notNull(),
  vehicleId: text("vehicle_id").notNull(),
  vehicleName: text("vehicle_name").notNull(),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  read: boolean("read").notNull().default(false),
  latitude: real("latitude"),
  longitude: real("longitude"),
  speed: integer("speed"),
  speedLimit: integer("speed_limit"),
  geofenceName: text("geofence_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Tabela: trips
export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: text("vehicle_id").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  totalDistance: real("total_distance").notNull().default(0),
  travelTime: integer("travel_time").notNull().default(0), // em minutos
  stoppedTime: integer("stopped_time").notNull().default(0), // em minutos
  averageSpeed: real("average_speed").notNull().default(0),
  maxSpeed: real("max_speed").notNull().default(0),
  stopsCount: integer("stops_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Tabela: location_points
export const locationPoints = pgTable("location_points", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  speed: integer("speed").notNull().default(0),
  heading: integer("heading").notNull().default(0),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  accuracy: real("accuracy"),
});

// Tabela: route_events
export const routeEvents = pgTable("route_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  type: routeEventTypeEnum("type").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  duration: integer("duration"), // em segundos
  speed: integer("speed"),
  speedLimit: integer("speed_limit"),
  geofenceName: text("geofence_name"),
  address: text("address"),
});

// Tabela: speed_violations
export const speedViolations = pgTable("speed_violations", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: text("vehicle_id").notNull(),
  vehicleName: text("vehicle_name").notNull(),
  speed: integer("speed").notNull(),
  speedLimit: integer("speed_limit").notNull(),
  excessSpeed: integer("excess_speed").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  duration: integer("duration").notNull().default(0), // em segundos
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Tabela: users
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Tabela: vehicle_location_history
export const vehicleLocationHistory = pgTable("vehicle_location_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id, { onDelete: "cascade" }),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  speed: integer("speed").notNull().default(0),
  heading: integer("heading").notNull().default(0),
  status: vehicleStatusEnum("status").notNull(),
  ignition: ignitionStatusEnum("ignition").notNull(),
  accuracy: real("accuracy"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============================================
// RELATIONS
// ============================================

export const tripsRelations = relations(trips, ({ many }) => ({
  locationPoints: many(locationPoints),
  routeEvents: many(routeEvents),
}));

export const locationPointsRelations = relations(locationPoints, ({ one }) => ({
  trip: one(trips, {
    fields: [locationPoints.tripId],
    references: [trips.id],
  }),
}));

export const routeEventsRelations = relations(routeEvents, ({ one }) => ({
  trip: one(trips, {
    fields: [routeEvents.tripId],
    references: [trips.id],
  }),
}));

export const vehicleLocationHistoryRelations = relations(vehicleLocationHistory, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleLocationHistory.vehicleId],
    references: [vehicles.id],
  }),
}));

// ============================================
// ZOD SCHEMAS (para validação)
// ============================================

// Vehicle schemas
export const vehicleSchema = z.object({
  id: z.string(),
  name: z.string(),
  licensePlate: z.string(),
  model: z.string().optional().nullable(),
  status: z.enum(["moving", "stopped", "idle", "offline"]),
  ignition: z.enum(["on", "off"]),
  currentSpeed: z.number(),
  speedLimit: z.number(),
  heading: z.number(),
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number(),
  lastUpdate: z.string(),
  batteryLevel: z.number().optional().nullable(),
});

export type Vehicle = z.infer<typeof vehicleSchema>;

export const insertVehicleSchema = vehicleSchema.omit({ id: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

// Location point schema
export const locationPointSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  speed: z.number(),
  heading: z.number(),
  timestamp: z.string(),
  accuracy: z.number().optional().nullable(),
});

export type LocationPoint = z.infer<typeof locationPointSchema>;

// Route event schema
export const routeEventSchema = z.object({
  id: z.string(),
  type: z.enum(["departure", "arrival", "stop", "speed_violation", "geofence_entry", "geofence_exit"]),
  latitude: z.number(),
  longitude: z.number(),
  timestamp: z.string(),
  duration: z.number().optional().nullable(),
  speed: z.number().optional().nullable(),
  speedLimit: z.number().optional().nullable(),
  geofenceName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

export type RouteEvent = z.infer<typeof routeEventSchema>;

// Trip schema
export const tripSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  totalDistance: z.number(),
  travelTime: z.number(),
  stoppedTime: z.number(),
  averageSpeed: z.number(),
  maxSpeed: z.number(),
  stopsCount: z.number(),
  points: z.array(locationPointSchema),
  events: z.array(routeEventSchema),
});

export type Trip = z.infer<typeof tripSchema>;

// Geofence rule schema
export const geofenceRuleSchema = z.object({
  type: z.enum(["entry", "exit", "dwell", "time_violation"]),
  enabled: z.boolean(),
  dwellTimeMinutes: z.number().optional().nullable(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  toleranceSeconds: z.number().optional().nullable(),
});

export type GeofenceRule = z.infer<typeof geofenceRuleSchema>;

// Geofence schema
export const geofenceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  type: z.enum(["circle", "polygon"]),
  active: z.boolean(),
  center: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional().nullable(),
  radius: z.number().optional().nullable(),
  points: z.array(z.object({
    latitude: z.number(),
    longitude: z.number(),
  })).optional().nullable(),
  rules: z.array(geofenceRuleSchema),
  vehicleIds: z.array(z.string()),
  lastTriggered: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

export type Geofence = z.infer<typeof geofenceSchema>;

export const insertGeofenceSchema = geofenceSchema.omit({ id: true });
export type InsertGeofence = z.infer<typeof insertGeofenceSchema>;

// Alert schema
export const alertSchema = z.object({
  id: z.string(),
  type: z.enum(["speed", "geofence_entry", "geofence_exit", "geofence_dwell", "system"]),
  priority: z.enum(["critical", "warning", "info"]),
  vehicleId: z.string(),
  vehicleName: z.string(),
  message: z.string(),
  timestamp: z.string(),
  read: z.boolean(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  speed: z.number().optional().nullable(),
  speedLimit: z.number().optional().nullable(),
  geofenceName: z.string().optional().nullable(),
});

export type Alert = z.infer<typeof alertSchema>;

export const insertAlertSchema = alertSchema.omit({ id: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;

// Speed violation schema
export const speedViolationSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  vehicleName: z.string(),
  speed: z.number(),
  speedLimit: z.number(),
  excessSpeed: z.number(),
  timestamp: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  duration: z.number(),
});

export type SpeedViolation = z.infer<typeof speedViolationSchema>;

// Vehicle stats schema
export const vehicleStatsSchema = z.object({
  totalViolations: z.number(),
  vehiclesWithViolations: z.number(),
  averageExcessSpeed: z.number(),
  violationsByDay: z.array(z.object({
    date: z.string(),
    count: z.number(),
  })),
  topViolators: z.array(z.object({
    vehicleId: z.string(),
    vehicleName: z.string(),
    totalViolations: z.number(),
    averageExcessSpeed: z.number(),
    lastViolation: z.string(),
  })),
});

export type VehicleStats = z.infer<typeof vehicleStatsSchema>;

// User schema
export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = { id: string; username: string; password: string };

// Tracking data schema (para receber dados de rastreadores)
export const trackingDataSchema = z.object({
  licensePlate: z.string().min(1, "Placa é obrigatória"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().min(0),
});

export type TrackingData = z.infer<typeof trackingDataSchema>;