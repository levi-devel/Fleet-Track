import type { Express } from 'express';
import { validateApiKey } from './middleware/api-key';
import { trackingDataSchema } from '@shared/schema';
import { storage } from './storage';
import type { VehicleStatus } from '@shared/schema';

/**
 * Calcula o status do veículo baseado na velocidade
 */
function calculateVehicleStatus(speed: number): VehicleStatus {
  if (speed === 0) {
    return 'stopped';
  }
  return 'moving';
}

/**
 * Registra as rotas de rastreamento de veículos
 */
export function registerTrackingRoutes(app: Express): void {
  /**
   * POST /api/tracking
   * Recebe dados de localização de um veículo e atualiza no sistema
   */
  app.post('/api/tracking', validateApiKey, async (req, res) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c8f2aa62-da2a-4442-b8d5-cb9e09f709d3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'tracking-routes.ts:27',message:'Tracking endpoint called',data:{body:req.body},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      // Valida os dados recebidos
      const parsed = trackingDataSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: parsed.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }

      const { licensePlate, latitude, longitude, speed } = parsed.data;

      // Busca o veículo pela placa
      const vehicle = await storage.getVehicleByLicensePlate(licensePlate);

      if (!vehicle) {
        return res.status(404).json({
          error: 'Veículo não encontrado',
          message: `Nenhum veículo cadastrado com a placa "${licensePlate}"`,
        });
      }

      // Calcula o novo status baseado na velocidade
      const newStatus = calculateVehicleStatus(speed);

      // Atualiza o veículo com os novos dados
      const updatedVehicle = await storage.updateVehicle(vehicle.id, {
        latitude,
        longitude,
        currentSpeed: speed,
        status: newStatus,
        lastUpdate: new Date().toISOString(),
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c8f2aa62-da2a-4442-b8d5-cb9e09f709d3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'tracking-routes.ts:65',message:'Vehicle updated - NO HISTORY SAVED',data:{vehicleId:vehicle.id,lat:latitude,lng:longitude,speed,hasAddLocationHistoryMethod:typeof (storage as any).addLocationHistory === 'function'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      return res.status(200).json({
        success: true,
        message: 'Localização atualizada com sucesso',
        vehicle: {
          id: updatedVehicle?.id,
          name: updatedVehicle?.name,
          licensePlate: updatedVehicle?.licensePlate,
          latitude: updatedVehicle?.latitude,
          longitude: updatedVehicle?.longitude,
          currentSpeed: updatedVehicle?.currentSpeed,
          status: updatedVehicle?.status,
          lastUpdate: updatedVehicle?.lastUpdate,
        },
      });
    } catch (error) {
      console.error('Erro ao processar dados de rastreamento:', error);
      return res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Falha ao processar os dados de rastreamento',
      });
    }
  });
}

