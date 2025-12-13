import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteVehicle } from "@/hooks/use-vehicle-mutations";
import type { Vehicle } from "@shared/schema";

interface VehicleDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  onSuccess?: () => void;
}

export function VehicleDeleteDialog({
  open,
  onOpenChange,
  vehicle,
  onSuccess,
}: VehicleDeleteDialogProps) {
  const deleteVehicle = useDeleteVehicle();

  const handleDelete = async () => {
    if (!vehicle) return;

    await deleteVehicle.mutateAsync(vehicle.id);
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Veículo</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o veículo{" "}
            <strong>{vehicle?.name}</strong> ({vehicle?.licensePlate})?
            <br />
            <br />
            Esta ação não pode ser desfeita. Todos os dados associados a este
            veículo serão removidos permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteVehicle.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteVehicle.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteVehicle.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

