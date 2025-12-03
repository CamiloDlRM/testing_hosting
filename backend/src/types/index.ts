import { Request } from 'express';

// Extendemos el Request de Express para incluir el usuario autenticado
export interface AuthRequest extends Request {
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

export interface CreateAplicacionDTO {
  nombre: string;
  repositorioGit: string;
  variablesEntorno?: Record<string, string>;
  tipoAplicacion?: string;
}

export interface UpdateAplicacionDTO {
  nombre?: string;
  variablesEntorno?: Record<string, string>;
}

// Tipos para Coolify API
export interface CoolifyAppConfig {
  name: string;
  git_repository: string;
  git_branch?: string;
  build_pack?: string;
  environment_variables?: Record<string, string>;
  domains?: string[];
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
  domains: string[];
  created_at: string;
}

// Tipos de respuesta de API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
