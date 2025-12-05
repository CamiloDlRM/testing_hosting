/**
 * Utilities para generar dominios de aplicaciones
 */

const BASE_DOMAIN = 'hostingroble.com';

/**
 * Convierte un string en un slug válido para subdominios
 * Ejemplo: "Mi App!" -> "mi-app"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Normalizar caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Eliminar diacríticos
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/[^\w-]+/g, '') // Eliminar caracteres especiales
    .replace(/--+/g, '-') // Múltiples guiones a uno solo
    .replace(/^-+/, '') // Eliminar guiones al inicio
    .replace(/-+$/, ''); // Eliminar guiones al final
}

/**
 * Genera un dominio para una aplicación
 * Formato: nombre_app.nombre_user.hostingroble.com
 *
 * @param appName - Nombre de la aplicación
 * @param userName - Nombre del usuario
 * @returns Dominio completo de la app
 *
 * Ejemplo:
 * generateDomain("Mi App", "Juan Pérez") -> "mi-app.juan-perez.hostingroble.com"
 */
export function generateDomain(appName: string, userName: string): string {
  const appSlug = slugify(appName);
  const userSlug = slugify(userName);

  // Validar que los slugs no estén vacíos
  if (!appSlug || !userSlug) {
    throw new Error('App name and user name cannot be empty after slugification');
  }

  // Limitar longitud de los slugs (máximo 63 caracteres por label en DNS)
  const maxLength = 20; // Dejamos espacio para el dominio base
  const truncatedAppSlug = appSlug.substring(0, maxLength);
  const truncatedUserSlug = userSlug.substring(0, maxLength);

  return `${truncatedAppSlug}.${truncatedUserSlug}.${BASE_DOMAIN}`;
}

/**
 * Genera una URL completa con protocolo
 * @param domain - Dominio de la aplicación
 * @param useHttps - Si debe usar HTTPS (default: true)
 * @returns URL completa
 */
export function generateUrl(domain: string, useHttps: boolean = true): string {
  const protocol = useHttps ? 'https' : 'http';
  return `${protocol}://${domain}`;
}

/**
 * Extrae el subdominio de usuario de un dominio
 * Ejemplo: "mi-app.juan-perez.hostingroble.com" -> "juan-perez"
 */
export function extractUserSubdomain(domain: string): string | null {
  const parts = domain.split('.');
  if (parts.length >= 3) {
    return parts[1]; // Segundo nivel del dominio
  }
  return null;
}

/**
 * Extrae el subdominio de app de un dominio
 * Ejemplo: "mi-app.juan-perez.hostingroble.com" -> "mi-app"
 */
export function extractAppSubdomain(domain: string): string | null {
  const parts = domain.split('.');
  if (parts.length >= 3) {
    return parts[0]; // Primer nivel del dominio
  }
  return null;
}
