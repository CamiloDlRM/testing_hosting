import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getEstadoColor(estado: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    DEPLOYING: 'bg-blue-100 text-blue-800',
    RUNNING: 'bg-green-100 text-green-800',
    STOPPED: 'bg-gray-100 text-gray-800',
    FAILED: 'bg-red-100 text-red-800',
    DELETED: 'bg-red-100 text-red-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    SUCCESS: 'bg-green-100 text-green-800',
  };

  return colors[estado] || 'bg-gray-100 text-gray-800';
}

export function getEstadoText(estado: string): string {
  const texts: Record<string, string> = {
    PENDING: 'Pendiente',
    DEPLOYING: 'Desplegando',
    RUNNING: 'En Ejecución',
    STOPPED: 'Detenido',
    FAILED: 'Fallido',
    DELETED: 'Eliminado',
    IN_PROGRESS: 'En Progreso',
    SUCCESS: 'Exitoso',
  };

  return texts[estado] || estado;
}
