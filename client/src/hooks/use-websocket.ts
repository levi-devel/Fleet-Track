import { useEffect, useRef, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Vehicle } from "@shared/schema";
import type { RealtimeChannel } from "@supabase/supabase-js";

type WebSocketMessage = {
  type: "vehicles";
  data: Vehicle[];
};

function isValidVehicleMessage(msg: unknown): msg is WebSocketMessage {
  if (!msg || typeof msg !== "object") return false;
  const obj = msg as Record<string, unknown>;
  return obj.type === "vehicles" && Array.isArray(obj.data);
}

// Converte row do banco (snake_case) para Vehicle (camelCase)
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

/**
 * Hook para escutar atualizações de veículos via Supabase Realtime
 */
export function useVehicleRealtime() {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Verifica se Supabase está configurado
    if (!isSupabaseConfigured) {
      console.log("Supabase not configured, skipping realtime");
      return;
    }

    // Cria canal para escutar mudanças na tabela vehicles
    const channel = supabase
      .channel('vehicles-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'vehicles',
        },
        async (payload) => {
          console.log('Vehicle change received:', payload.eventType);
          
          // Atualiza o cache do React Query
          const currentData = queryClient.getQueryData<Vehicle[]>(["/api/vehicles"]) || [];
          
          switch (payload.eventType) {
            case 'INSERT': {
              const newVehicle = toVehicle(payload.new);
              queryClient.setQueryData(["/api/vehicles"], [...currentData, newVehicle]);
              break;
            }
            case 'UPDATE': {
              const updatedVehicle = toVehicle(payload.new);
              queryClient.setQueryData(
                ["/api/vehicles"],
                currentData.map(v => v.id === updatedVehicle.id ? updatedVehicle : v)
              );
              break;
            }
            case 'DELETE': {
              const deletedId = (payload.old as any).id;
              queryClient.setQueryData(
                ["/api/vehicles"],
                currentData.filter(v => v.id !== deletedId)
              );
              break;
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return channelRef;
}

/**
 * Hook para escutar atualizações de alertas via Supabase Realtime
 */
export function useAlertsRealtime() {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
        },
        async () => {
          // Invalida cache para recarregar alertas
          queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return channelRef;
}

/**
 * Hook legado para WebSocket tradicional
 * Usado quando Supabase não está configurado
 */
export function useVehicleWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    // Se Supabase está configurado, não usa WebSocket
    if (isSupabaseConfigured) {
      console.log("Using Supabase Realtime instead of WebSocket");
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = window.location.origin
        .replace(/^http:/, "ws:")
        .replace(/^https:/, "wss:") + "/ws";
      
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected to", wsUrl);
      };

      ws.onmessage = (event) => {
        try {
          const message: unknown = JSON.parse(event.data);
          
          if (isValidVehicleMessage(message)) {
            queryClient.setQueryData(["/api/vehicles"], message.data);
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected, reconnecting in 3s...");
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        ws.close();
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return wsRef;
}

/**
 * Hook combinado que usa Supabase Realtime se configurado,
 * senão fallback para WebSocket tradicional
 */
export function useVehicleUpdates() {
  // Usa Supabase Realtime se configurado
  const realtimeRef = useVehicleRealtime();
  // Fallback para WebSocket se Supabase não está configurado
  const wsRef = useVehicleWebSocket();
  
  return isSupabaseConfigured ? realtimeRef : wsRef;
}
