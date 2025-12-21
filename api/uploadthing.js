/**
 * UploadThing FileRouter para adjuntos de tareas
 * Este archivo define las rutas de subida de archivos usando UploadThing
 */

const { createUploadthing } = require("uploadthing/express");
const { UTApi } = require("uploadthing/server");

const f = createUploadthing();

// Instancia de la API para operaciones como eliminar archivos
const utapi = new UTApi();

/**
 * FileRouter para adjuntos de tareas
 * Soporta múltiples tipos de archivos con límites específicos
 */
const uploadRouter = {
    // Ruta para subir adjuntos a tareas
    tareaAdjunto: f({
        // Imágenes: hasta 10MB cada una, máximo 5 archivos
        image: {
            maxFileSize: "10MB",
            maxFileCount: 5
        },
        // PDFs: hasta 10MB
        pdf: {
            maxFileSize: "10MB",
            maxFileCount: 5
        },
        // Documentos de texto/office
        "application/msword": { maxFileSize: "10MB" },
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { maxFileSize: "10MB" },
        "application/vnd.ms-excel": { maxFileSize: "10MB" },
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { maxFileSize: "10MB" },
        "text/plain": { maxFileSize: "10MB" },
        "text/csv": { maxFileSize: "10MB" },
        "text/markdown": { maxFileSize: "10MB" },
        // Archivos comprimidos: hasta 50MB
        "application/zip": { maxFileSize: "50MB" },
        "application/x-rar-compressed": { maxFileSize: "50MB" },
        "application/x-7z-compressed": { maxFileSize: "50MB" },
    })
        .middleware(async ({ req }) => {
            // Aquí se puede agregar verificación de autenticación si es necesario
            // Por ahora, la autenticación se maneja en el endpoint que guarda metadatos

            // Retornar metadata que estará disponible en onUploadComplete
            return {
                uploadedAt: new Date().toISOString()
            };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            console.log("   URL:", file.url);
            console.log("   Key:", file.key);
            console.log("   Size:", file.size);

            // Retornar datos del archivo para el cliente
            return {
                url: file.url,
                key: file.key,
                name: file.name,
                size: file.size
            };
        }),
};

module.exports = {
    uploadRouter,
    utapi
};
