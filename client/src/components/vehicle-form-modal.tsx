import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateVehicle, useUpdateVehicle } from "@/hooks/use-vehicle-mutations";
import type { Vehicle } from "@shared/schema";

const vehicleFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  licensePlate: z.string().min(1, "Placa é obrigatória"),
  model: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  speedLimit: z.coerce.number().min(0).max(200),
  status: z.enum(["moving", "stopped", "idle", "offline"]),
  ignition: z.enum(["on", "off"]),
});

type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

interface VehicleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: Vehicle;
  onSuccess?: () => void;
}

export function VehicleFormModal({
  open,
  onOpenChange,
  vehicle,
  onSuccess,
}: VehicleFormModalProps) {
  const isEditing = !!vehicle;
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      name: "",
      licensePlate: "",
      model: "",
      latitude: -23.5505,
      longitude: -46.6333,
      speedLimit: 80,
      status: "offline",
      ignition: "off",
    },
  });

  useEffect(() => {
    if (vehicle) {
      form.reset({
        name: vehicle.name,
        licensePlate: vehicle.licensePlate,
        model: vehicle.model ?? "",
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
        speedLimit: vehicle.speedLimit,
        status: vehicle.status,
        ignition: vehicle.ignition,
      });
    } else {
      form.reset({
        name: "",
        licensePlate: "",
        model: "",
        latitude: -23.5505,
        longitude: -46.6333,
        speedLimit: 80,
        status: "offline",
        ignition: "off",
      });
    }
  }, [vehicle, form]);

  const isLoading = createVehicle.isPending || updateVehicle.isPending;

  const onSubmit = async (values: VehicleFormValues) => {
    const vehicleData = {
      name: values.name,
      licensePlate: values.licensePlate,
      model: values.model || null,
      latitude: values.latitude,
      longitude: values.longitude,
      speedLimit: values.speedLimit,
      status: values.status,
      ignition: values.ignition,
      currentSpeed: vehicle?.currentSpeed ?? 0,
      heading: vehicle?.heading ?? 0,
      accuracy: vehicle?.accuracy ?? 5,
      lastUpdate: new Date().toISOString(),
      batteryLevel: vehicle?.batteryLevel ?? null,
    };

    if (isEditing && vehicle) {
      await updateVehicle.mutateAsync({ id: vehicle.id, data: vehicleData });
    } else {
      await createVehicle.mutateAsync(vehicleData);
    }

    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Veículo" : "Novo Veículo"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize as informações do veículo."
              : "Preencha os dados para adicionar um novo veículo à frota."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Caminhão 01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="licensePlate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placa</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC-1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Mercedes Actros" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="-23.5505"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="-46.6333"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="speedLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limite de Velocidade (km/h)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={200} {...field} />
                  </FormControl>
                  <FormDescription>
                    Alertas serão gerados quando o veículo exceder este limite.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Inicial</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="offline">Offline</SelectItem>
                        <SelectItem value="stopped">Parado</SelectItem>
                        <SelectItem value="idle">Ocioso</SelectItem>
                        <SelectItem value="moving">Em Movimento</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ignition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ignição</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="off">Desligada</SelectItem>
                        <SelectItem value="on">Ligada</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Salvar Alterações" : "Criar Veículo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

