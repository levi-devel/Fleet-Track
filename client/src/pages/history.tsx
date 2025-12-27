import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { 
  Calendar as CalendarIcon, Clock, MapPin, Gauge, 
  Route, Timer, PauseCircle, TrendingUp, Download,
  Flag, CheckCircle2, AlertTriangle, Shield, Play, Navigation
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Vehicle, Trip, RouteEvent } from "@shared/schema";
import "leaflet/dist/leaflet.css";

const startIcon = L.divIcon({
  html: `<svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#22c55e" stroke="white" stroke-width="2"/><path d="M11 16 L21 16 M16 11 L16 21" stroke="white" stroke-width="2"/></svg>`,
  className: "start-marker",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const endIcon = L.divIcon({
  html: `<svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="#ef4444" stroke="white" stroke-width="2"/><rect x="11" y="11" width="10" height="10" fill="white"/></svg>`,
  className: "end-marker",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const stopIcon = L.divIcon({
  html: `<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#f59e0b" stroke="white" stroke-width="2"/></svg>`,
  className: "stop-marker",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function History() {
  const searchParams = new URLSearchParams(useSearch());
  const vehicleIdParam = searchParams.get("vehicleId");

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicleIdParam || "all");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  const [startTime, setStartTime] = useState<string>("00:00");
  const [endTime, setEndTime] = useState<string>("23:59");
  const [selectedEvent, setSelectedEvent] = useState<RouteEvent | null>(null);
  const [lastAddresses, setLastAddresses] = useState<{ address: string; time: string; lat: number; lng: number }[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  // Combina data com hora para criar o intervalo completo
  const getDateTimeRange = () => {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    
    const fromDateTime = setMinutes(setHours(dateRange.from, startHour), startMin);
    const toDateTime = setMinutes(setHours(dateRange.to, endHour), endMin);
    
    return { from: fromDateTime, to: toDateTime };
  };

  const dateTimeRange = getDateTimeRange();

  const { data: vehicles = [], isLoading: isLoadingVehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const isGeneralView = selectedVehicleId === "all";
  const tripsQueryUrl = isGeneralView
    ? `/api/trips?startDate=${dateTimeRange.from.toISOString()}&endDate=${dateTimeRange.to.toISOString()}`
    : `/api/trips?vehicleId=${selectedVehicleId}&startDate=${dateTimeRange.from.toISOString()}&endDate=${dateTimeRange.to.toISOString()}`;
  
  const { data: trips = [], isLoading: isLoadingTrips } = useQuery<Trip[]>({
    queryKey: [tripsQueryUrl],
  });

  const selectedTrip = isGeneralView ? undefined : trips[0];

  const aggregatedSummary = useMemo(() => {
    try {
      if (!isGeneralView || !trips || trips.length === 0) return null;
      const totalDistance = trips.reduce((sum, t) => sum + (t.totalDistance || 0), 0);
      const travelTime = trips.reduce((sum, t) => sum + (t.travelTime || 0), 0);
      const stoppedTime = trips.reduce((sum, t) => sum + (t.stoppedTime || 0), 0);
      const maxSpeed = trips.reduce((max, t) => Math.max(max, t.maxSpeed || 0), 0);
      const stopsCount = trips.reduce((sum, t) => sum + (t.stopsCount || 0), 0);
      const weightedAvgSpeed = travelTime > 0
        ? Math.round(
            trips.reduce((acc, t) => acc + (t.averageSpeed || 0) * (t.travelTime || 0), 0) / travelTime
          )
        : 0;
      const startTime = trips.reduce<string | null>((min, t) => {
        if (!t.startTime) return min;
        const ts = new Date(t.startTime).toISOString();
        if (min === null || ts < min) return ts;
        return min;
      }, null);
      const endTime = trips.reduce<string | null>((max, t) => {
        if (!t.endTime) return max;
        const ts = new Date(t.endTime).toISOString();
        if (max === null || ts > max) return ts;
        return max;
      }, null);
      const allEvents = trips.flatMap(t => t.events || []).sort((a, b) => {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });
      const allPoints = trips.flatMap(t => t.points || []);
      return {
        totalDistance,
        travelTime,
        stoppedTime,
        averageSpeed: weightedAvgSpeed,
        maxSpeed,
        stopsCount,
        startTime,
        endTime,
        events: allEvents,
        points: allPoints,
      };
    } catch (error) {
      console.error("Erro ao calcular resumo agregado:", error);
      return null;
    }
  }, [isGeneralView, trips]);

  // Buscar endereços dos últimos 5 pontos via geocodificação reversa
  useEffect(() => {
    const pointsSource = isGeneralView ? aggregatedSummary?.points ?? [] : selectedTrip?.points ?? [];
    if (!pointsSource || pointsSource.length === 0) {
      setLastAddresses([]);
      return;
    }
    const fetchAddresses = async () => {
      setIsLoadingAddresses(true);
      const uniquePoints = [] as typeof pointsSource;
      const pointsReversed = [...pointsSource].reverse();
      for (const point of pointsReversed) {
        if (uniquePoints.length >= 5) break;
        const isDuplicate = uniquePoints.some(p =>
          Math.abs(p.latitude - point.latitude) < 0.0005 &&
          Math.abs(p.longitude - point.longitude) < 0.0005
        );
        if (!isDuplicate) {
          uniquePoints.push(point);
        }
      }
      const addresses: { address: string; time: string; lat: number; lng: number }[] = [];
      for (const point of uniquePoints) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${point.latitude}&lon=${point.longitude}&zoom=18&addressdetails=1`,
            { headers: { "Accept-Language": "pt-BR" } }
          );
          if (response.ok) {
            const data = await response.json();
            const address = data.display_name || "Endereço não encontrado";
            addresses.push({
              address: address.split(",").slice(0, 3).join(", "),
              time: format(new Date(point.timestamp), "HH:mm", { locale: ptBR }),
              lat: point.latitude,
              lng: point.longitude,
            });
          }
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
        }
      }
      setLastAddresses(addresses);
      setIsLoadingAddresses(false);
    };
    fetchAddresses();
  }, [isGeneralView, selectedTrip?.id, aggregatedSummary?.points]);

  const quickFilters = [
    { label: "Hoje", days: 0 },
    { label: "Ontem", days: 1 },
    { label: "Últimos 7 dias", days: 7 },
    { label: "Últimos 30 dias", days: 30 },
  ];

  const handleQuickFilter = (days: number) => {
    const to = endOfDay(new Date());
    const from = startOfDay(days === 0 ? new Date() : subDays(new Date(), days));
    setDateRange({ from, to });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const getEventIcon = (type: RouteEvent["type"]) => {
    switch (type) {
      case "departure": return <Play className="h-4 w-4 text-green-500" />;
      case "arrival": return <CheckCircle2 className="h-4 w-4 text-red-500" />;
      case "stop": return <PauseCircle className="h-4 w-4 text-amber-500" />;
      case "speed_violation": return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "geofence_entry":
      case "geofence_exit": return <Shield className="h-4 w-4 text-primary" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  const getEventLabel = (type: RouteEvent["type"]) => {
    switch (type) {
      case "departure": return "Partida";
      case "arrival": return "Chegada";
      case "stop": return "Parada";
      case "speed_violation": return "Excesso de velocidade";
      case "geofence_entry": return "Entrada em geofence";
      case "geofence_exit": return "Saída de geofence";
      default: return "Evento";
    }
  };

  const routePositions = useMemo(() => {
    if (isGeneralView) return [];
    if (!selectedTrip?.points) return [];
    return selectedTrip.points.map(p => [p.latitude, p.longitude] as [number, number]);
  }, [selectedTrip, isGeneralView]);

  const routesByTrip = useMemo(() => {
    if (!isGeneralView) return [];
    return trips.map(t => t.points.map(p => [p.latitude, p.longitude] as [number, number]));
  }, [trips, isGeneralView]);

  const samplePositions = (positions: [number, number][], maxPoints = 500) => {
    if (positions.length <= maxPoints) return positions;
    const step = Math.ceil(positions.length / maxPoints);
    const sampled: [number, number][] = [];
    for (let i = 0; i < positions.length; i += step) {
      sampled.push(positions[i]);
    }
    sampled.push(positions[positions.length - 1]);
    return sampled;
  };

  const mapCenter = useMemo(() => {
    try {
      const positions = isGeneralView ? routesByTrip.flat() : routePositions;
      if (positions && positions.length > 0) {
        // Encontrar o centro da bounding box de todos os pontos
        let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
        
        positions.forEach(([lat, lng]) => {
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
        });

        return [(minLat + maxLat) / 2, (minLng + maxLng) / 2] as [number, number];
      }
    } catch (e) {
      console.error("Erro ao calcular centro do mapa:", e);
    }
    return [-23.5505, -46.6333] as [number, number];
  }, [routePositions, routesByTrip, isGeneralView]);

  return (
    <div className="flex h-full" data-testid="history-page">
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border bg-card">
          <div className="flex flex-wrap items-center gap-4">
            <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
              <SelectTrigger className="w-[200px]" data-testid="select-vehicle">
                <SelectValue placeholder="Todos os veículos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="all" value="all">
                  Todos os veículos
                </SelectItem>
                {vehicles.map(vehicle => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} - {vehicle.licensePlate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="button-date-range">
                  <CalendarIcon className="h-4 w-4" />
                  {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[1100]" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="px-2 py-1.5 rounded-md border border-input bg-background text-sm"
                data-testid="input-start-time"
              />
              <span className="text-muted-foreground">até</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="px-2 py-1.5 rounded-md border border-input bg-background text-sm"
                data-testid="input-end-time"
              />
            </div>

            <div className="flex gap-2">
              {quickFilters.map(filter => (
                <Button
                  key={filter.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFilter(filter.days)}
                  data-testid={`filter-${filter.days}`}
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            {selectedTrip && (
              <Button variant="outline" className="gap-2 ml-auto" data-testid="button-export">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            )}
          </div>
          <div className="mt-3 transition-all duration-300">
            {isGeneralView ? (
              <Badge variant="default" className="animate-in fade-in-50 slide-in-from-left-1">Visão Geral</Badge>
            ) : (
              (() => {
                const v = vehicles.find(v => v.id === selectedVehicleId);
                const label = v ? `${v.name} - ${v.licensePlate}` : "Filtrado por veículo";
                return <Badge variant="outline" className="animate-in fade-in-50 slide-in-from-right-1">{label}</Badge>;
              })()
            )}
          </div>
        </div>

        <div className="flex-1 relative">
          {isLoadingTrips ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (isGeneralView ? trips.length === 0 : !selectedTrip) ? (
            <div className="flex items-center justify-center h-full bg-muted/30">
              <div className="text-center">
                <MapPin className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum trajeto encontrado</h3>
                <p className="text-sm text-muted-foreground">
                  Não há dados de trajeto para o período selecionado
                </p>
              </div>
            </div>
          ) : (
            <MapContainer
              key={isGeneralView ? "general" : selectedVehicleId || "filtered"}
              center={mapCenter}
              zoom={12}
              className="h-full w-full transition-all duration-300"
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {isGeneralView ? (
                <>
                  {routesByTrip.map((positions, idx) => (
                    positions.length > 1 ? (
                      <Polyline
                        key={`route-${idx}`}
                        positions={samplePositions(positions)}
                        pathOptions={{
                          color: ["#3b82f6", "#22c55e", "#ef4444", "#a855f7", "#f59e0b", "#06b6d4", "#84cc16", "#f43f5e"][idx % 8],
                          weight: 3,
                          opacity: 0.7,
                        }}
                      />
                    ) : null
                  ))}
                  {trips.flatMap(t => t.events.filter(e => e.type === "stop")).map((event, index) => (
                    <Marker
                      key={event.id}
                      position={[event.latitude, event.longitude]}
                      icon={stopIcon}
                    >
                      <Popup>
                        <div className="text-sm">
                          <div className="font-semibold text-amber-600">Parada</div>
                          <div>Duração: {event.duration ? formatDuration(event.duration) : "N/A"}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {event.address || "Endereço não disponível"}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </>
              ) : (
                <>
                  {routePositions.length > 1 && (
                    <Polyline
                      positions={samplePositions(routePositions)}
                      pathOptions={{
                        color: "#3b82f6",
                        weight: 4,
                        opacity: 0.8,
                      }}
                    />
                  )}
                  {routePositions.length > 0 && (
                    <>
                      <Marker position={routePositions[0]} icon={startIcon}>
                        <Popup>
                          <div className="text-sm">
                            <div className="font-semibold text-green-600">Partida</div>
                            <div>{selectedTrip?.startTime ? format(new Date(selectedTrip.startTime), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "N/A"}</div>
                          </div>
                        </Popup>
                      </Marker>
                      <Marker position={routePositions[routePositions.length - 1]} icon={endIcon}>
                        <Popup>
                          <div className="text-sm">
                            <div className="font-semibold text-red-600">Chegada</div>
                            <div>{selectedTrip?.endTime ? format(new Date(selectedTrip.endTime), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "N/A"}</div>
                          </div>
                        </Popup>
                      </Marker>
                    </>
                  )}
                  {(selectedTrip?.events || [])
                    .filter(e => e.type === "stop")
                    .map((event, index) => (
                      <Marker
                        key={event.id}
                        position={[event.latitude, event.longitude]}
                        icon={stopIcon}
                      >
                        <Popup>
                          <div className="text-sm">
                            <div className="font-semibold text-amber-600">Parada {index + 1}</div>
                            <div>Duração: {event.duration ? formatDuration(event.duration) : "N/A"}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {event.address || "Endereço não disponível"}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                </>
              )}
            </MapContainer>
          )}
        </div>
      </div>

      <div className="w-[380px] flex-shrink-0 border-l border-border bg-sidebar flex flex-col">
        {(isGeneralView ? trips.length > 0 : !!selectedTrip) ? (
          <>
            <div className="p-4 border-b border-sidebar-border">
              <h2 className="font-semibold text-lg mb-4">{isGeneralView ? "Resumo Geral" : "Resumo do Trajeto"}</h2>
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase mb-1">
                      <Route className="h-3 w-3" />
                      Distância
                    </div>
                    <div className="text-xl font-mono font-bold">
                      {formatDistance(isGeneralView ? (aggregatedSummary?.totalDistance || 0) : (selectedTrip?.totalDistance || 0))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase mb-1">
                      <Timer className="h-3 w-3" />
                      Tempo
                    </div>
                    <div className="text-xl font-mono font-bold">
                      {formatDuration(isGeneralView ? (aggregatedSummary?.travelTime || 0) : (selectedTrip?.travelTime || 0))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase mb-1">
                      <PauseCircle className="h-3 w-3" />
                      Parado
                    </div>
                    <div className="text-xl font-mono font-bold">
                      {formatDuration(isGeneralView ? (aggregatedSummary?.stoppedTime || 0) : (selectedTrip?.stoppedTime || 0))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase mb-1">
                      <Gauge className="h-3 w-3" />
                      Vel. Média
                    </div>
                    <div className="text-xl font-mono font-bold">
                      {Math.round(isGeneralView ? (aggregatedSummary?.averageSpeed || 0) : (selectedTrip?.averageSpeed || 0))} km/h
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase mb-1">
                      <TrendingUp className="h-3 w-3" />
                      Vel. Máx
                    </div>
                    <div className="text-xl font-mono font-bold">
                      {Math.round(isGeneralView ? (aggregatedSummary?.maxSpeed || 0) : (selectedTrip?.maxSpeed || 0))} km/h
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase mb-1">
                      <MapPin className="h-3 w-3" />
                      Paradas
                    </div>
                    <div className="text-xl font-mono font-bold">
                      {isGeneralView ? (aggregatedSummary?.stopsCount || 0) : (selectedTrip?.stopsCount || 0)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Últimos 5 Endereços */}
              <div className="px-4 py-3 border-b border-sidebar-border">
                <h3 className="font-medium flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  Últimos Endereços
                </h3>
              </div>
              <div className="p-4 border-b border-sidebar-border">
                {isLoadingAddresses ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : lastAddresses.length > 0 ? (
                  <div className="space-y-2">
                    {lastAddresses.map((item, index) => (
                      <div
                        key={index}
                        className="p-2 rounded-md bg-card hover:bg-sidebar-accent transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate" title={item.address}>
                              {item.address}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.time} • {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum endereço disponível
                  </p>
                )}
              </div>

              <div className="px-4 py-3 border-b border-sidebar-border">
                <h3 className="font-medium">{isGeneralView ? "Eventos da Frota" : "Eventos do Trajeto"}</h3>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                  {(isGeneralView ? (aggregatedSummary?.events || []) : (selectedTrip?.events || [])).map(event => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={cn(
                        "w-full p-3 rounded-md text-left hover-elevate active-elevate-2",
                        selectedEvent?.id === event.id ? "bg-sidebar-accent" : "bg-card"
                      )}
                      data-testid={`event-${event.id}`}
                    >
                      <div className="flex items-start gap-3">
                        {getEventIcon(event.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{getEventLabel(event.type)}</span>
                            {event.type === "speed_violation" && event.speed && event.speedLimit && (
                              <Badge variant="destructive" className="text-[10px]">
                                {event.speed} / {event.speedLimit} km/h
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(event.timestamp), "HH:mm", { locale: ptBR })}
                            {event.duration && ` • ${formatDuration(event.duration)}`}
                          </div>
                          {event.address && (
                            <div className="text-xs text-muted-foreground mt-1 truncate">
                              {event.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            {isLoadingVehicles || isLoadingTrips ? (
              <div className="space-y-4 w-full">
                <Skeleton className="h-8 w-full" />
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Selecione um veículo e período para ver o resumo
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
