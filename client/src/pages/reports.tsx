import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Gauge, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Download, Calendar as CalendarIcon, Truck, BarChart3, MapPin, Users
} from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { VehicleStats, SpeedViolation, FleetStats } from "@shared/schema";

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const statsQueryUrl = `/api/reports/speed-stats?startDate=${dateRange.from.toISOString()}&endDate=${dateRange.to.toISOString()}`;
  const violationsQueryUrl = `/api/reports/violations?startDate=${dateRange.from.toISOString()}&endDate=${dateRange.to.toISOString()}`;

  const { data: stats, isLoading: isLoadingStats } = useQuery<VehicleStats>({
    queryKey: [statsQueryUrl],
  });

  const { data: violations = [], isLoading: isLoadingViolations } = useQuery<SpeedViolation[]>({
    queryKey: [violationsQueryUrl],
  });

  const { data: fleetStats, isLoading: isLoadingFleetStats } = useQuery<FleetStats>({
    queryKey: [`/api/reports/fleet-stats?startDate=${dateRange.from.toISOString()}&endDate=${dateRange.to.toISOString()}`],
  });

  const quickFilters = [
    { label: "Últimos 7 dias", days: 7 },
    { label: "Últimos 30 dias", days: 30 },
    { label: "Últimos 90 dias", days: 90 },
  ];

  const handleQuickFilter = (days: number) => {
    setDateRange({
      from: subDays(new Date(), days),
      to: new Date(),
    });
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-destructive" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const chartData = stats?.violationsByDay?.map(item => ({
    date: format(new Date(item.date), "dd/MM", { locale: ptBR }),
    count: item.count,
  })) || [];

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Cabeçalho
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório de Velocidade", pageWidth / 2, yPos, { align: "center" });
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Análise de conformidade e infrações de velocidade", pageWidth / 2, yPos, { align: "center" });
    
    yPos += 8;
    doc.setFontSize(9);
    doc.text(
      `Período: ${format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`,
      pageWidth / 2,
      yPos,
      { align: "center" }
    );
    
    yPos += 15;

    // Estatísticas Gerais da Frota
    if (fleetStats) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Estatísticas Gerais da Frota", 14, yPos);
      yPos += 8;

      const fleetStatsData = [
        ["Total de Veículos", `${fleetStats.totalVehicles} cadastrados`],
        ["Velocidade Média Geral", `${fleetStats.averageSpeed} km/h`],
        ["Distância Total", `${fleetStats.totalDistance ? (fleetStats.totalDistance / 1000).toFixed(1) : 0} km`],
        [
          "Veículo Mais Ativo",
          fleetStats.mostActiveVehicle
            ? `${fleetStats.mostActiveVehicle.name} - ${(fleetStats.mostActiveVehicle.distance / 1000).toFixed(1)} km • ${fleetStats.mostActiveVehicle.avgSpeed} km/h`
            : "Sem dados"
        ],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [["Métrica", "Valor"]],
        body: fleetStatsData,
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], fontSize: 10, fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 12;
    }

    // Verificar se precisa de nova página
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }

    // Estatísticas de Infrações
    if (stats) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Estatísticas de Infrações", 14, yPos);
      yPos += 8;

      const violationStatsData = [
        ["Total de Infrações", `${stats.totalViolations}`],
        ["Veículos com Infrações", `${stats.vehiclesWithViolations} veículos`],
        ["Excesso Médio", `+${Math.round(stats.averageExcessSpeed)} km/h acima do limite`],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [["Métrica", "Valor"]],
        body: violationStatsData,
        theme: "grid",
        headStyles: { fillColor: [231, 76, 60], fontSize: 10, fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 12;
    }

    // Verificar se precisa de nova página
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = 20;
    }

    // Top 10 Veículos com Mais Infrações
    if (stats?.topViolators && stats.topViolators.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Top 10 Veículos com Mais Infrações", 14, yPos);
      yPos += 8;

      const topViolatorsData = stats.topViolators.slice(0, 10).map((v, idx) => [
        `${idx + 1}`,
        v.vehicleName,
        `${v.totalViolations}`,
        `+${Math.round(v.averageExcessSpeed)} km/h`,
        format(new Date(v.lastViolation), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["#", "Veículo", "Total", "Excesso Médio", "Última Infração"]],
        body: topViolatorsData,
        theme: "striped",
        headStyles: { fillColor: [52, 73, 94], fontSize: 9, fontStyle: "bold" },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { halign: "center" },
          2: { halign: "center" },
          3: { halign: "center" },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 12;
    }

    // Verificar se precisa de nova página
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = 20;
    }

    // Detalhamento de Infrações (últimas 50)
    if (violations && violations.length > 0) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Detalhamento de Infrações (Últimas 50)", 14, yPos);
      yPos += 8;

      const violationsData = violations.slice(0, 50).map(v => [
        format(new Date(v.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        v.vehicleName,
        `${v.speed} km/h`,
        `${v.speedLimit} km/h`,
        `+${v.excessSpeed} km/h`,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Data/Hora", "Veículo", "Vel.", "Limite", "Excesso"]],
        body: violationsData,
        theme: "striped",
        headStyles: { fillColor: [52, 73, 94], fontSize: 8, fontStyle: "bold" },
        styles: { fontSize: 7, cellPadding: 2 },
        margin: { left: 14, right: 14 },
        columnStyles: {
          2: { halign: "center" },
          3: { halign: "center" },
          4: { halign: "center", textColor: [231, 76, 60] },
        },
      });
    }

    // Rodapé em todas as páginas
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `FleetTrack - Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`,
        14,
        pageHeight - 10
      );
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: "right" });
    }

    // Salvar PDF
    const fileName = `relatorio-velocidade-${format(dateRange.from, "yyyy-MM-dd")}-${format(dateRange.to, "yyyy-MM-dd")}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="flex flex-col h-full" data-testid="reports-page">
      <div className="p-4 border-b border-border bg-card">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold">Relatórios de Velocidade</h1>
            <p className="text-sm text-muted-foreground">
              Análise de conformidade e infrações de velocidade
            </p>
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="button-date-range">
                  <CalendarIcon className="h-4 w-4" />
                  {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from) {
                      setDateRange({ 
                        from: range.from, 
                        to: range.to || range.from 
                      });
                    }
                  }}
                  locale={ptBR}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            
            {quickFilters.map(filter => (
              <Button
                key={filter.days}
                variant="outline"
                size="sm"
                onClick={() => handleQuickFilter(filter.days)}
                data-testid={`filter-${filter.days}`}
              >
                {filter.label}
              </Button>
            ))}
            
            <Button variant="outline" className="gap-2" data-testid="button-export" onClick={handleExportPDF}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Estatísticas Gerais da Frota */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              {isLoadingFleetStats ? (
                <Skeleton className="h-24" />
              ) : (
                <>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Users className="h-4 w-4" />
                    Total de Veículos
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold font-mono">
                      {fleetStats?.totalVehicles || 0}
                    </span>
                    <span className="text-sm text-muted-foreground pb-1">cadastrados</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              {isLoadingFleetStats ? (
                <Skeleton className="h-24" />
              ) : (
                <>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Gauge className="h-4 w-4" />
                    Velocidade Média Geral
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold font-mono">
                      {fleetStats?.averageSpeed || 0}
                    </span>
                    <span className="text-sm text-muted-foreground pb-1">km/h</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              {isLoadingFleetStats ? (
                <Skeleton className="h-24" />
              ) : (
                <>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <MapPin className="h-4 w-4" />
                    Distância Total
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold font-mono">
                      {fleetStats?.totalDistance ? (fleetStats.totalDistance / 1000).toFixed(1) : 0}
                    </span>
                    <span className="text-sm text-muted-foreground pb-1">km</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              {isLoadingFleetStats ? (
                <Skeleton className="h-24" />
              ) : (
                <>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Truck className="h-4 w-4" />
                    Veículo Mais Ativo
                  </div>
                  {fleetStats?.mostActiveVehicle ? (
                    <>
                      <div className="text-lg font-bold truncate" title={fleetStats.mostActiveVehicle.name}>
                        {fleetStats.mostActiveVehicle.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(fleetStats.mostActiveVehicle.distance / 1000).toFixed(1)} km • {fleetStats.mostActiveVehicle.avgSpeed} km/h
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">Sem dados</div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Estatísticas de Infrações */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              {isLoadingStats ? (
                <Skeleton className="h-24" />
              ) : (
                <>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    Total de Infrações
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold font-mono">
                      {stats?.totalViolations || 0}
                    </span>
                    <div className="flex items-center gap-1 pb-1">
                      {getTrendIcon(stats?.totalViolations || 0, (stats?.totalViolations || 0) * 0.9)}
                      <span className="text-xs text-muted-foreground">vs. período anterior</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              {isLoadingStats ? (
                <Skeleton className="h-24" />
              ) : (
                <>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Truck className="h-4 w-4" />
                    Veículos com Infrações
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold font-mono">
                      {stats?.vehiclesWithViolations || 0}
                    </span>
                    <span className="text-sm text-muted-foreground pb-1">veículos</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              {isLoadingStats ? (
                <Skeleton className="h-24" />
              ) : (
                <>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                    <Gauge className="h-4 w-4" />
                    Excesso Médio
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold font-mono text-destructive">
                      +{Math.round(stats?.averageExcessSpeed || 0)}
                    </span>
                    <span className="text-sm text-muted-foreground pb-1">km/h acima do limite</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Infrações por Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-64" />
            ) : chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum dado disponível para o período</p>
                </div>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.count > 10 ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Top 10 Veículos com Mais Infrações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : !stats?.topViolators || stats.topViolators.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma infração registrada no período</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead className="text-right">Total de Infrações</TableHead>
                    <TableHead className="text-right">Excesso Médio</TableHead>
                    <TableHead className="text-right">Última Infração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topViolators.map((violator, index) => (
                    <TableRow 
                      key={violator.vehicleId}
                      className={cn(index < 3 && "bg-destructive/5")}
                      data-testid={`violator-${violator.vehicleId}`}
                    >
                      <TableCell>
                        <Badge 
                          variant={index < 3 ? "destructive" : "secondary"}
                          className="w-8 justify-center"
                        >
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{violator.vehicleName}</TableCell>
                      <TableCell className="text-right font-mono">
                        {violator.totalViolations}
                      </TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        +{Math.round(violator.averageExcessSpeed)} km/h
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDate(violator.lastViolation)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Detalhamento de Infrações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingViolations ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : violations.length === 0 ? (
              <div className="text-center py-8">
                <Gauge className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma infração detalhada disponível</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Veículo</TableHead>
                    <TableHead className="text-right">Velocidade</TableHead>
                    <TableHead className="text-right">Limite</TableHead>
                    <TableHead className="text-right">Excesso</TableHead>
                    <TableHead className="text-right">Duração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {violations.slice(0, 20).map((violation) => (
                    <TableRow key={violation.id} data-testid={`violation-${violation.id}`}>
                      <TableCell className="text-muted-foreground">
                        {formatDate(violation.timestamp)}
                      </TableCell>
                      <TableCell className="font-medium">{violation.vehicleName}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        {violation.speed} km/h
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {violation.speedLimit} km/h
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">
                          +{violation.excessSpeed} km/h
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {violation.duration}s
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
