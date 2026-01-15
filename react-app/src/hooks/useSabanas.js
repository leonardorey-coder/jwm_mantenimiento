import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sabanasService } from '../services/api';

export function useSabanas(params = {}) {
  return useQuery({
    queryKey: ['sabanas', params],
    queryFn: async () => {
      const response = await sabanasService.getAll(params);
      return response.data;
    },
    staleTime: 30000,
  });
}

export function useSabana(id) {
  return useQuery({
    queryKey: ['sabana', id],
    queryFn: async () => {
      const response = await sabanasService.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateSabana() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => sabanasService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sabanas'] });
    },
  });
}

export function useUpdateSabana() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => sabanasService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['sabanas'] });
      queryClient.invalidateQueries({ queryKey: ['sabana', id] });
    },
  });
}

export function useDeleteSabana() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => sabanasService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sabanas'] });
    },
  });
}

export function useUpdateItemSabana() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sabanaId, itemId, data }) => sabanasService.updateItem(sabanaId, itemId, data),
    onSuccess: (_, { sabanaId }) => {
      queryClient.invalidateQueries({ queryKey: ['sabanas'] });
      queryClient.invalidateQueries({ queryKey: ['sabana', sabanaId] });
    },
  });
}

export function useArchivarSabana() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => sabanasService.archivar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sabanas'] });
    },
  });
}
