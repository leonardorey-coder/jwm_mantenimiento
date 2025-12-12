// ========================================
// CHECKLIST API SERVICE
// Servicio para comunicación con la API de Checklist
// ========================================

const ChecklistAPI = {
    baseUrl: '/api/checklist',

    /**
     * Obtener token de autenticación del localStorage
     */
    getAuthToken() {
        // El token se guarda directamente en accessToken
        return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || null;
    },

    /**
     * Obtener headers con autenticación
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    /**
     * Manejo de respuestas de la API
     */
    async handleResponse(response) {
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
            throw new Error(error.error || error.message || `HTTP ${response.status}`);
        }
        return response.json();
    },

    // ==========================================
    // CATEGORÍAS
    // ==========================================

    /**
     * Obtener todas las categorías del checklist
     */
    async getCategorias() {
        console.log('[ChecklistAPI.getCategorias] Iniciando fetch...');
        console.log('[ChecklistAPI.getCategorias] URL:', `${this.baseUrl}/categorias`);
        console.log('[ChecklistAPI.getCategorias] Headers:', this.getHeaders());
        try {
            const response = await fetch(`${this.baseUrl}/categorias`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            console.log('[ChecklistAPI.getCategorias] Response status:', response.status);
            console.log('[ChecklistAPI.getCategorias] Response ok:', response.ok);
            const data = await this.handleResponse(response);
            console.log('[ChecklistAPI.getCategorias] Datos parseados:', data);
            return data;
        } catch (error) {
            console.error('❌ [ChecklistAPI.getCategorias] Error:', error);
            throw error;
        }
    },

    /**
     * Agregar nueva categoría
     */
    async addCategoria(data) {
        try {
            const response = await fetch(`${this.baseUrl}/categorias`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('❌ Error creando categoría:', error);
            throw error;
        }
    },

    /**
     * Eliminar categoría
     */
    async deleteCategoria(categoriaId) {
        try {
            const response = await fetch(`${this.baseUrl}/categorias/${categoriaId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('❌ Error eliminando categoría:', error);
            throw error;
        }
    },

    // ==========================================
    // ÍTEMS DEL CATÁLOGO
    // ==========================================

    /**
     * Obtener todos los ítems del catálogo
     */
    async getCatalogItems(categoriaId = null) {
        try {
            let url = `${this.baseUrl}/items`;
            if (categoriaId) {
                url += `?categoria_id=${categoriaId}`;
            }
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('❌ Error obteniendo ítems:', error);
            throw error;
        }
    },

    /**
     * Agregar nuevo ítem al catálogo
     */
    async addCatalogItem(data) {
        try {
            const response = await fetch(`${this.baseUrl}/items`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('❌ Error creando ítem:', error);
            throw error;
        }
    },

    /**
     * Eliminar ítem del catálogo
     */
    async deleteCatalogItem(itemId) {
        try {
            const response = await fetch(`${this.baseUrl}/items/${itemId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('❌ Error eliminando ítem:', error);
            throw error;
        }
    },

    // ==========================================
    // DATOS DE CHECKLIST POR CUARTO
    // ==========================================

    /**
     * Obtener datos de checklist para todos los cuartos
     */
    async getAllChecklistData(filters = {}) {
        console.log('[ChecklistAPI.getAllChecklistData] Iniciando...');
        console.log('[ChecklistAPI.getAllChecklistData] Filters:', filters);
        try {
            let url = `${this.baseUrl}/cuartos`;
            const params = new URLSearchParams();

            if (filters.edificio_id) {
                params.append('edificio_id', filters.edificio_id);
            }
            if (filters.categoria_id) {
                params.append('categoria_id', filters.categoria_id);
            }

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            console.log('[ChecklistAPI.getAllChecklistData] URL final:', url);
            console.log('[ChecklistAPI.getAllChecklistData] Headers:', this.getHeaders());

            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders()
            });

            console.log('[ChecklistAPI.getAllChecklistData] Response status:', response.status);
            console.log('[ChecklistAPI.getAllChecklistData] Response ok:', response.ok);

            const data = await this.handleResponse(response);
            console.log('[ChecklistAPI.getAllChecklistData] Datos parseados:');
            console.log('   - Es array:', Array.isArray(data));
            console.log('   - Cantidad:', data?.length || 0);
            if (data?.length > 0) {
                console.log('   - Primer elemento:', JSON.stringify(data[0], null, 2));
            }
            return data;
        } catch (error) {
            console.error('❌ [ChecklistAPI.getAllChecklistData] Error:', error);
            console.error('❌ [ChecklistAPI.getAllChecklistData] Stack:', error.stack);
            throw error;
        }
    },

    /**
     * Obtener datos de checklist para un cuarto específico
     */
    async getChecklistByCuarto(cuartoId) {
        try {
            const response = await fetch(`${this.baseUrl}/cuartos/${cuartoId}`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('❌ Error obteniendo checklist del cuarto:', error);
            throw error;
        }
    },

    /**
     * Actualizar estado de un ítem del checklist
     */
    async updateItemEstado(cuartoId, itemId, estado, observacion = null) {
        try {
            const response = await fetch(`${this.baseUrl}/cuartos/${cuartoId}/items/${itemId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify({ estado, observacion })
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('❌ Error actualizando ítem:', error);
            throw error;
        }
    },

    /**
     * Actualizar múltiples ítems a la vez
     */
    async updateItemsBulk(cuartoId, items) {
        try {
            const response = await fetch(`${this.baseUrl}/cuartos/${cuartoId}/items`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify({ items })
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('❌ Error en actualización masiva:', error);
            throw error;
        }
    },

    // ==========================================
    // RESÚMENES
    // ==========================================

    /**
     * Obtener resumen de estados de un cuarto
     */
    async getResumenByCuarto(cuartoId) {
        try {
            const response = await fetch(`${this.baseUrl}/cuartos/${cuartoId}/resumen`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('❌ Error obteniendo resumen:', error);
            throw error;
        }
    },

    /**
     * Obtener resumen general de todos los cuartos
     */
    async getResumenGeneral() {
        try {
            const response = await fetch(`${this.baseUrl}/resumen`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('❌ Error obteniendo resumen general:', error);
            throw error;
        }
    },

    // ==========================================
    // FOTOS DE CHECKLIST
    // ==========================================

    /**
     * Obtener fotos de un cuarto
     */
    async getFotosByCuarto(cuartoId) {
        try {
            const response = await fetch(`${this.baseUrl}/cuartos/${cuartoId}/fotos`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('❌ Error obteniendo fotos:', error);
            throw error;
        }
    },

    /**
     * Subir foto de checklist
     */
    async uploadFoto(cuartoId, file, catalogItemId = null, notas = null) {
        try {
            const formData = new FormData();
            formData.append('foto', file);
            if (catalogItemId) {
                formData.append('catalog_item_id', catalogItemId);
            }
            if (notas) {
                formData.append('notas', notas);
            }

            const token = this.getAuthToken();
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${this.baseUrl}/cuartos/${cuartoId}/fotos`, {
                method: 'POST',
                headers: headers,
                body: formData
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('❌ Error subiendo foto:', error);
            throw error;
        }
    },

    /**
     * Eliminar foto de checklist
     */
    async deleteFoto(fotoId) {
        try {
            const response = await fetch(`${this.baseUrl.replace('/checklist', '')}/checklist/fotos/${fotoId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('❌ Error eliminando foto:', error);
            throw error;
        }
    },

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================

    /**
     * Inicializar tablas de checklist (solo admin)
     */
    async initChecklistTables() {
        try {
            const response = await fetch(`${this.baseUrl}/init`, {
                method: 'POST',
                headers: this.getHeaders()
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error('❌ Error inicializando tablas:', error);
            throw error;
        }
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.ChecklistAPI = ChecklistAPI;
}
