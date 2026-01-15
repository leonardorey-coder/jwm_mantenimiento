import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checklistService } from '../services/api';

export function useChecklist(params = {}) {
  return useQuery({
    queryKey: ['checklist', params],
    queryFn: async () => {
      const response = await checklistService.getAll(params);
      return response.data;
    },
    staleTime: 30000,
  });
}

export function useChecklistCuarto(cuartoId) {
  return useQuery({
    queryKey: ['checklist-cuarto', cuartoId],
    queryFn: async () => {
      const response = await checklistService.getByCuarto(cuartoId);
      return response.data;
    },
    enabled: !!cuartoId,
  });
}

export function useCategoriasChecklist() {
  return useQuery({
    queryKey: ['checklist-categorias'],
    queryFn: async () => {
      const response = await checklistService.getCategorias();
      return response.data;
    },
    staleTime: 300000,
  });
}

export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }) => checklistService.updateItem(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-cuarto'] });
    },
  });
}

export function useCreateChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => checklistService.createItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-cuarto'] });
    },
  });
}

export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId) => checklistService.deleteItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist'] });
      queryClient.invalidateQueries({ queryKey: ['checklist-cuarto'] });
    },
  });
}
