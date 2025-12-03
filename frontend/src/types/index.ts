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
  repositorioGit: string;
  estado: EstadoApp;
  variablesEntorno: Record<string, string> | null;
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
  variablesEntorno?: Record<string, string>;
  tipoAplicacion?: string;
}

export interface UpdateAplicacionData {
  nombre?: string;
  variablesEntorno?: Record<string, string>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
