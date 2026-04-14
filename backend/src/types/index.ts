import { Request } from 'express';

// Extendemos el Request de Express para incluir el usuario autenticado
// Hacemos el tipo genérico para soportar parámetros de ruta, query y body
export interface AuthRequest<
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: {
    id: string;
    email: string;
  };
}

// DTOs para requests
export interface RegisterDTO {
  email: string;
  password: string;
  nombre: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface VolumeMount {
  source: string; // nombre del volumen o path del host
  target: string; // path dentro del contenedor
}

export interface CreateAplicacionDTO {
  nombre: string;
  repositorioGit: string;
  ramaBranch?: string;
  variablesEntorno?: Record<string, string>;

  // Configuración de deployment
  tipoAplicacion?: 'NIXPACKS' | 'STATIC' | 'DOCKERFILE' | 'DOCKER_COMPOSE';
  puerto?: number;

  // Para Docker Compose: servicio que recibe tráfico público
  composeServiceName?: string;

  // Comandos personalizados (opcionales)
  installCommand?: string;
  buildCommand?: string;
  startCommand?: string;
  baseDirectory?: string;
  publishDirectory?: string;

  // Límites de recursos del contenedor
  limiteMemoria?: string;
  limiteCpu?: string;

  // Volúmenes del contenedor
  volumes?: VolumeMount[];
}

export interface UpdateAplicacionDTO {
  nombre?: string;
  variablesEntorno?: Record<string, string>;
  ramaBranch?: string;
  tipoAplicacion?: 'NIXPACKS' | 'STATIC' | 'DOCKERFILE' | 'DOCKER_COMPOSE';
  puerto?: number;
  installCommand?: string;
  buildCommand?: string;
  startCommand?: string;
  baseDirectory?: string;
  publishDirectory?: string;

  // Límites de recursos del contenedor
  limiteMemoria?: string;
  limiteCpu?: string;

  // Volúmenes del contenedor
  volumes?: VolumeMount[];
}

// Tipos para Coolify API
export interface CoolifyAppConfig {
  name: string;
  git_repository: string;
  git_branch?: string;
  build_pack?: string;
  environment_variables?: Record<string, string>;
  domains?: string | string[]; // Coolify acepta string, pero internamente puede ser array

  // Configuración adicional
  ports_exposes?: string;
  install_command?: string;
  build_command?: string;
  start_command?: string;
  base_directory?: string;
  publish_directory?: string;
  is_static?: boolean;

  // Límites de recursos del contenedor (Docker)
  limits_memory?: string;  // Ej: "512m", "1g"
  limits_cpus?: string;    // Ej: "0.5", "1"

  // Volúmenes: array de strings "source:target"
  volumes?: string[];

  // Para Docker Compose: dominios por servicio [{ name: "service_name", domain: "http://domain.com" }]
  docker_compose_domains?: Array<{ name: string; domain: string }>;
  // Ruta del archivo compose dentro del repo (ej: "/docker-compose.yml")
  docker_compose_location?: string;
  // Contenido raw del compose (anula el archivo del repo si se especifica)
  docker_compose_raw?: string;
}

export interface CoolifyDeploymentResponse {
  id: string;
  status: string;
  created_at: string;
  logs?: string;
}

export interface CoolifyAppResponse {
  id: string;
  name: string;
  status: string;
  git_repository: string;
  domains: string | string[]; // Puede ser string o array
  created_at: string;
}

// Tipos de respuesta de API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
