/**
 * UploadThing FileRouter para adjuntos de tareas
 * Este archivo define las rutas de subida de archivos usando UploadThing
 */

const { createUploadthing } = require('uploadthing/express');
const { UTApi } = require('uploadthing/server');
const path = require('path');
const fs = require('fs');

const f = createUploadthing();

// Cargar token/secret de UploadThing
let uploadthingToken = process.env.UPLOADTHING_TOKEN;
const uploadthingSecret = process.env.UPLOADTHING_SECRET;

// Si no hay token en el entorno, intentar leer de .env.local
if (!uploadthingToken) {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(
        /^UPLOADTHING_TOKEN=['\"]?([^'\"\\n]+)['\"]?/m
      );
      if (match) {
        uploadthingToken = match[1].trim();
      }
    }
  } catch (e) {
    // Ignorar errores al leer .env.local
  }
}

// Instancia de la API para operaciones como eliminar archivos
// Preferir apiKey (secret) sobre token
let utapi;
if (uploadthingSecret) {
  utapi = new UTApi({ apiKey: uploadthingSecret.trim() });
} else if (uploadthingToken) {
  utapi = new UTApi({ token: uploadthingToken.trim() });
} else {
  utapi = new UTApi();
}

/**
 * FileRouter para adjuntos de tareas
 * Soporta múltiples tipos de archivos con límites específicos
 */
const uploadRouter = {
  // Ruta para subir adjuntos a tareas
  tareaAdjunto: f({
    // Imágenes: hasta 10MB cada una, máximo 5 archivos
    image: {
      maxFileSize: '10MB',
      maxFileCount: 5,
    },
    // PDFs: hasta 10MB
    pdf: {
      maxFileSize: '10MB',
      maxFileCount: 5,
    },
    // Documentos de texto/office
    'application/msword': { maxFileSize: '10MB' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      maxFileSize: '10MB',
    },
    'application/vnd.ms-excel': { maxFileSize: '10MB' },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
      maxFileSize: '10MB',
    },
    'text/plain': { maxFileSize: '10MB' },
    'text/csv': { maxFileSize: '10MB' },
    'text/markdown': { maxFileSize: '10MB' },
    // Archivos comprimidos: hasta 50MB
    'application/zip': { maxFileSize: '50MB' },
    'application/x-rar-compressed': { maxFileSize: '50MB' },
    'application/x-7z-compressed': { maxFileSize: '50MB' },
  })
    .middleware(async ({ req }) => {
      // Aquí se puede agregar verificación de autenticación si es necesario
      // Por ahora, la autenticación se maneja en el endpoint que guarda metadatos
      console.log('📤 UploadThing middleware - archivo recibido');

      // Retornar metadata que estará disponible en onUploadComplete
      return {
        uploadedAt: new Date().toISOString(),
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('✅ UploadThing - Archivo subido:', file.name);
      console.log('   URL:', file.url);
      console.log('   Key:', file.key);
      console.log('   Size:', file.size);

      // Retornar datos del archivo para el cliente
      return {
        url: file.url,
        key: file.key,
        name: file.name,
        size: file.size,
      };
    }),

  // Ruta para subir fondos de pantalla de usuario
  fondoPantalla: f({
    // Solo imágenes: hasta 5MB, solo 1 archivo a la vez
    image: {
      maxFileSize: '5MB',
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
      console.log('📤 UploadThing middleware - fondo de pantalla recibido');

      // Retornar metadata que estará disponible en onUploadComplete
      return {
        uploadedAt: new Date().toISOString(),
        uploadType: 'background',
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('✅ UploadThing - Fondo de pantalla subido:', file.name);
      console.log('   URL:', file.url);
      console.log('   Key:', file.key);
      console.log('   Size:', file.size);

      // Retornar datos del archivo para el cliente
      return {
        url: file.url,
        key: file.key,
        name: file.name,
        size: file.size,
        uploadType: 'background',
      };
    }),
};

module.exports = {
  uploadRouter,
  utapi,
};
