import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usuariosService } from '../services/api';

export function useUsuarios(params = {}) {
  return useQuery({
    queryKey: ['usuarios', params],
    queryFn: async () => {
      const response = await usuariosService.getAll(params);
      return response.data;
    },
    staleTime: 60000,
  });
}

export function useUsuario(id) {
  return useQuery({
    queryKey: ['usuario', id],
    queryFn: async () => {
      const response = await usuariosService.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => usuariosService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
}

export function useUpdateUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => usuariosService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['usuario', id] });
    },
  });
}

export function useDeleteUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => usuariosService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
}

export function useActivateUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => usuariosService.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
}

export function useDeactivateUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => usuariosService.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
}

export function useUnlockUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => usuariosService.unlock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, password }) => usuariosService.resetPassword(id, password),
  });
}
