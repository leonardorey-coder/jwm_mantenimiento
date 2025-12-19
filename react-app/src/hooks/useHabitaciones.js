import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { edificiosService, cuartosService, mantenimientosService, alertasService } from '../services/api';

export function useEdificios() {
  return useQuery({
    queryKey: ['edificios'],
    queryFn: async () => {
      const response = await edificiosService.getAll();
      return response.data;
    },
  });
}

export function useCuartos() {
  return useQuery({
    queryKey: ['cuartos'],
    queryFn: async () => {
      const response = await cuartosService.getAll();
      return response.data;
    },
  });
}

export function useMantenimientos(cuartoId) {
  return useQuery({
    queryKey: ['mantenimientos', cuartoId],
    queryFn: async () => {
      const response = await mantenimientosService.getAll(cuartoId);
      return response.data;
    },
  });
}

export function useAlertasPendientes() {
  return useQuery({
    queryKey: ['alertas', 'pendientes'],
    queryFn: async () => {
      const response = await alertasService.getPendientes();
      return response.data;
    },
    refetchInterval: 60000,
  });
}

export function useAlertasEmitidas(fecha) {
  return useQuery({
    queryKey: ['alertas', 'emitidas', fecha],
    queryFn: async () => {
      const response = await alertasService.getEmitidas(fecha);
      return response.data;
    },
  });
}

export function useCreateMantenimiento() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => mantenimientosService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mantenimientos'] });
      queryClient.invalidateQueries({ queryKey: ['cuartos'] });
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
    },
  });
}

export function useUpdateMantenimiento() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => mantenimientosService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mantenimientos'] });
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
    },
  });
}

export function useDeleteMantenimiento() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => mantenimientosService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mantenimientos'] });
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
    },
  });
}

export function useUpdateCuarto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => cuartosService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cuartos'] });
    },
  });
}

export function useMarcarAlertaEmitida() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => mantenimientosService.marcarEmitida(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
    },
  });
}
