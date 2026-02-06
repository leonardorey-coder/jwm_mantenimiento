import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { espaciosComunesService, mantenimientosService } from '../services/api';

export function useEspacios(filters = {}) {
  return useQuery({
    queryKey: ['espacios', filters],
    queryFn: async () => {
      const response = await espaciosComunesService.getAll(filters);
      return response.data;
    },
    staleTime: 30000,
  });
}

export function useEspacio(id) {
  return useQuery({
    queryKey: ['espacio', id],
    queryFn: async () => {
      const response = await espaciosComunesService.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateEspacio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => espaciosComunesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['espacios'] });
    },
  });
}

export function useUpdateEspacio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => espaciosComunesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['espacios'] });
    },
  });
}

export function useDeleteEspacio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => espaciosComunesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['espacios'] });
    },
  });
}

export function useMantenimientosEspacio(espacioId) {
  return useQuery({
    queryKey: ['mantenimientos-espacio', espacioId],
    queryFn: async () => {
      const response = await espaciosComunesService.getMantenimientos(espacioId);
      return response.data;
    },
    enabled: !!espacioId,
  });
}

export function useCreateMantenimientoEspacio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => espaciosComunesService.createMantenimiento(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['espacios'] });
      queryClient.invalidateQueries({ queryKey: ['mantenimientos-espacio', data.espacio_id] });
    },
  });
}
