export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      vehicles: {
        Row: {
          id: string
          name: string
          license_plate: string
          model: string | null
          status: 'moving' | 'stopped' | 'idle' | 'offline'
          ignition: 'on' | 'off'
          current_speed: number
          speed_limit: number
          heading: number
          latitude: number
          longitude: number
          accuracy: number
          last_update: string
          battery_level: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          license_plate: string
          model?: string | null
          status: 'moving' | 'stopped' | 'idle' | 'offline'
          ignition: 'on' | 'off'
          current_speed: number
          speed_limit: number
          heading: number
          latitude: number
          longitude: number
          accuracy: number
          last_update?: string
          battery_level?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          license_plate?: string
          model?: string | null
          status?: 'moving' | 'stopped' | 'idle' | 'offline'
          ignition?: 'on' | 'off'
          current_speed?: number
          speed_limit?: number
          heading?: number
          latitude?: number
          longitude?: number
          accuracy?: number
          last_update?: string
          battery_level?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      geofences: {
        Row: {
          id: string
          name: string
          description: string | null
          type: 'circle' | 'polygon'
          active: boolean
          center: Json | null
          radius: number | null
          points: Json | null
          rules: Json
          vehicle_ids: string[]
          last_triggered: string | null
          color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          type: 'circle' | 'polygon'
          active?: boolean
          center?: Json | null
          radius?: number | null
          points?: Json | null
          rules: Json
          vehicle_ids?: string[]
          last_triggered?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          type?: 'circle' | 'polygon'
          active?: boolean
          center?: Json | null
          radius?: number | null
          points?: Json | null
          rules?: Json
          vehicle_ids?: string[]
          last_triggered?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      alerts: {
        Row: {
          id: string
          type: 'speed' | 'geofence_entry' | 'geofence_exit' | 'geofence_dwell' | 'system'
          priority: 'critical' | 'warning' | 'info'
          vehicle_id: string
          vehicle_name: string
          message: string
          timestamp: string
          read: boolean
          latitude: number | null
          longitude: number | null
          speed: number | null
          speed_limit: number | null
          geofence_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type: 'speed' | 'geofence_entry' | 'geofence_exit' | 'geofence_dwell' | 'system'
          priority: 'critical' | 'warning' | 'info'
          vehicle_id: string
          vehicle_name: string
          message: string
          timestamp?: string
          read?: boolean
          latitude?: number | null
          longitude?: number | null
          speed?: number | null
          speed_limit?: number | null
          geofence_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: 'speed' | 'geofence_entry' | 'geofence_exit' | 'geofence_dwell' | 'system'
          priority?: 'critical' | 'warning' | 'info'
          vehicle_id?: string
          vehicle_name?: string
          message?: string
          timestamp?: string
          read?: boolean
          latitude?: number | null
          longitude?: number | null
          speed?: number | null
          speed_limit?: number | null
          geofence_name?: string | null
          created_at?: string
        }
      }
      trips: {
        Row: {
          id: string
          vehicle_id: string
          start_time: string
          end_time: string
          total_distance: number
          travel_time: number
          stopped_time: number
          average_speed: number
          max_speed: number
          stops_count: number
          points: Json
          events: Json
          created_at: string
        }
        Insert: {
          id?: string
          vehicle_id: string
          start_time: string
          end_time: string
          total_distance: number
          travel_time: number
          stopped_time: number
          average_speed: number
          max_speed: number
          stops_count: number
          points: Json
          events: Json
          created_at?: string
        }
        Update: {
          id?: string
          vehicle_id?: string
          start_time?: string
          end_time?: string
          total_distance?: number
          travel_time?: number
          stopped_time?: number
          average_speed?: number
          max_speed?: number
          stops_count?: number
          points?: Json
          events?: Json
          created_at?: string
        }
      }
      speed_violations: {
        Row: {
          id: string
          vehicle_id: string
          vehicle_name: string
          speed: number
          speed_limit: number
          excess_speed: number
          timestamp: string
          latitude: number
          longitude: number
          duration: number
          created_at: string
        }
        Insert: {
          id?: string
          vehicle_id: string
          vehicle_name: string
          speed: number
          speed_limit: number
          excess_speed: number
          timestamp?: string
          latitude: number
          longitude: number
          duration: number
          created_at?: string
        }
        Update: {
          id?: string
          vehicle_id?: string
          vehicle_name?: string
          speed?: number
          speed_limit?: number
          excess_speed?: number
          timestamp?: string
          latitude?: number
          longitude?: number
          duration?: number
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          username: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
