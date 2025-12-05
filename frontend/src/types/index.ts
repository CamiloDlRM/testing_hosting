export interface User {
  id: string;
  email: string;
  nombre: string;
  createdAt: string;
}

export interface Aplicacion {
  id: string;
  userId: string;
  coolifyAppId: string | null;
  nombre: string;
  dominio: string | null; // URL de la app: nombre_app.nombre_user.hostingroble.com
  repositorioGit: string;
  ramaBranch: string;
  estado: EstadoApp;
  variablesEntorno: Record<string, string> | null;

  // Configuración de deployment
  tipoAplicacion: TipoAplicacion;
  buildPack: string;
  puerto: number;

  // Comandos personalizados
  installCommand?: string | null;
  buildCommand?: string | null;
  startCommand?: string | null;
  baseDirectory?: string | null;
  publishDirectory?: string | null;

  ultimoDeployment: string | null;
  createdAt: string;
  updatedAt: string;
  deployments?: Deployment[];
}

export interface Deployment {
  id: string;
  aplicacionId: string;
  version: string;
  estado: EstadoDeployment;
  logs: string | null;
  timestamp: string;
}

export enum EstadoApp {
  PENDING = 'PENDING',
  DEPLOYING = 'DEPLOYING',
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  FAILED = 'FAILED',
  DELETED = 'DELETED',
}

export enum EstadoDeployment {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum TipoAplicacion {
  NIXPACKS = 'NIXPACKS',
  STATIC = 'STATIC',
  DOCKERFILE = 'DOCKERFILE',
  DOCKER_COMPOSE = 'DOCKER_COMPOSE',
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  nombre: string;
}

export interface CreateAplicacionData {
  nombre: string;
  repositorioGit: string;
  ramaBranch?: string;
  variablesEntorno?: Record<string, string>;

  // Configuración de deployment
  tipoAplicacion?: TipoAplicacion;
  puerto?: number;

  // Comandos personalizados
  installCommand?: string;
  buildCommand?: string;
  startCommand?: string;
  baseDirectory?: string;
  publishDirectory?: string;
}

export interface UpdateAplicacionData {
  nombre?: string;
  variablesEntorno?: Record<string, string>;
  ramaBranch?: string;
  puerto?: number;
  installCommand?: string;
  buildCommand?: string;
  startCommand?: string;
  baseDirectory?: string;
  publishDirectory?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
