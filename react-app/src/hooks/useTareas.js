import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tareasService } from '../services/api';

export function useTareas(filters = {}) {
  return useQuery({
    queryKey: ['tareas', filters],
    queryFn: async () => {
      const response = await tareasService.getAll(filters);
      return response.data;
    },
    staleTime: 30000,
  });
}

export function useTarea(id) {
  return useQuery({
    queryKey: ['tarea', id],
    queryFn: async () => {
      const response = await tareasService.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateTarea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => tareasService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
    },
  });
}

export function useUpdateTarea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => tareasService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
      queryClient.invalidateQueries({ queryKey: ['tarea', id] });
    },
  });
}

export function useDeleteTarea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => tareasService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tareas'] });
    },
  });
}

export function useAdjuntosTarea(tareaId) {
  return useQuery({
    queryKey: ['tarea-adjuntos', tareaId],
    queryFn: async () => {
      const response = await tareasService.getAdjuntos(tareaId);
      return response.data;
    },
    enabled: !!tareaId,
  });
}

export function useUploadAdjunto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tareaId, formData }) => tareasService.uploadAdjunto(tareaId, formData),
    onSuccess: (_, { tareaId }) => {
      queryClient.invalidateQueries({ queryKey: ['tarea-adjuntos', tareaId] });
    },
  });
}

export function useDeleteAdjunto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ adjuntoId, tareaId }) => tareasService.deleteAdjunto(adjuntoId),
    onSuccess: (_, { tareaId }) => {
      queryClient.invalidateQueries({ queryKey: ['tarea-adjuntos', tareaId] });
    },
  });
}
