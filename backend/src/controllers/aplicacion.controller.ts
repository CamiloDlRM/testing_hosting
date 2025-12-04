import { Response } from 'express';
import { AuthRequest, CreateAplicacionDTO, UpdateAplicacionDTO, ApiResponse } from '../types';
import prisma from '../utils/prisma';
import coolifyService from '../services/coolify.service';
import { EstadoApp } from '@prisma/client';

/**
 * Crear una nueva aplicación (solo si el usuario no tiene una)
 */
export const createAplicacion = async (
  req: AuthRequest<{}, {}, CreateAplicacionDTO>,
  res: Response<ApiResponse>
) => {
  try {
    const userId = req.user!.id;
    const {
      nombre,
      repositorioGit,
      ramaBranch,
      variablesEntorno,
      tipoAplicacion,
      puerto,
      installCommand,
      buildCommand,
      startCommand,
      baseDirectory,
      publishDirectory,
    } = req.body;

    // VERIFICAR: El usuario solo puede tener UNA aplicación
    const existingApp = await prisma.aplicacion.findUnique({
      where: { userId },
    });

    if (existingApp) {
      return res.status(400).json({
        success: false,
        error: 'You already have an application. Please delete it before creating a new one.',
      });
    }

    // Mapear buildPack según el tipo de aplicación
    const buildPackMap: Record<string, string> = {
      NIXPACKS: 'nixpacks',
      STATIC: 'static',
      DOCKERFILE: 'dockerfile',
      DOCKER_COMPOSE: 'dockercompose',
    };

    const tipoApp = tipoAplicacion || 'NIXPACKS';
    const buildPack = buildPackMap[tipoApp] || 'nixpacks';

    // Crear la aplicación en la base de datos primero (estado PENDING)
    const aplicacion = await prisma.aplicacion.create({
      data: {
        userId,
        nombre,
        repositorioGit,
        ramaBranch: ramaBranch || 'main',
        variablesEntorno: variablesEntorno || {},
        estado: EstadoApp.PENDING,
        tipoAplicacion: tipoApp as any,
        buildPack,
        puerto: puerto || 3000,
        installCommand,
        buildCommand,
        startCommand,
        baseDirectory,
        publishDirectory,
      },
    });

    try {
      // Crear la aplicación en Coolify con configuración completa
      const coolifyApp = await coolifyService.createApplication({
        name: nombre,
        git_repository: repositorioGit,
        git_branch: ramaBranch || 'main',
        build_pack: buildPack,
        environment_variables: variablesEntorno,
        ports_exposes: puerto?.toString() || '3000',
        install_command: installCommand,
        build_command: buildCommand,
        start_command: startCommand,
        base_directory: baseDirectory,
        publish_directory: publishDirectory,
        is_static: tipoApp === 'STATIC',
      });

      // Actualizar con el ID de Coolify
      const updatedApp = await prisma.aplicacion.update({
        where: { id: aplicacion.id },
        data: {
          coolifyAppId: coolifyApp.id,
          estado: EstadoApp.PENDING,
        },
      });

      // Iniciar el deployment en Coolify automáticamente
      try {
        await coolifyService.deployApplication(coolifyApp.id);

        // Actualizar estado a DEPLOYING
        await prisma.aplicacion.update({
          where: { id: aplicacion.id },
          data: { estado: EstadoApp.DEPLOYING },
        });

        // Crear registro de deployment
        await prisma.deployment.create({
          data: {
            aplicacionId: updatedApp.id,
            version: '1.0.0',
            estado: 'IN_PROGRESS',
          },
        });
      } catch (deployError: any) {
        console.warn('Application created but deployment failed to start:', deployError.message);
        // La app se creó pero no se deployó, mantener estado PENDING
      }

      return res.status(201).json({
        success: true,
        data: updatedApp,
        message: 'Application created and deployment started',
      });
    } catch (coolifyError: any) {
      // Si falla la creación en Coolify, actualizar estado a FAILED
      await prisma.aplicacion.update({
        where: { id: aplicacion.id },
        data: { estado: EstadoApp.FAILED },
      });

      return res.status(500).json({
        success: false,
        error: `Failed to create application in Coolify: ${coolifyError.message}`,
      });
    }
  } catch (error: any) {
    console.error('Create application error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Obtener la aplicación del usuario
 */
export const getMyAplicacion = async (
  req: AuthRequest,
  res: Response<ApiResponse>
) => {
  try {
    const userId = req.user!.id;

    const aplicacion = await prisma.aplicacion.findUnique({
      where: { userId },
      include: {
        deployments: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });

    if (!aplicacion) {
      return res.status(404).json({
        success: false,
        error: 'No application found',
      });
    }

    // Si tiene coolifyAppId, sincronizar estado con Coolify
    if (aplicacion.coolifyAppId) {
      try {
        const coolifyApp = await coolifyService.getApplication(aplicacion.coolifyAppId);

        // Mapear estado de Coolify a nuestro estado
        let estadoActualizado = aplicacion.estado;
        if (coolifyApp.status === 'running') estadoActualizado = EstadoApp.RUNNING;
        else if (coolifyApp.status === 'stopped') estadoActualizado = EstadoApp.STOPPED;
        else if (coolifyApp.status === 'deploying') estadoActualizado = EstadoApp.DEPLOYING;
        else if (coolifyApp.status === 'failed') estadoActualizado = EstadoApp.FAILED;

        // Actualizar si el estado cambió
        if (estadoActualizado !== aplicacion.estado) {
          await prisma.aplicacion.update({
            where: { id: aplicacion.id },
            data: { estado: estadoActualizado },
          });
          aplicacion.estado = estadoActualizado;
        }
      } catch (coolifyError) {
        console.error('Error syncing with Coolify:', coolifyError);
        // No falla la request, solo no sincroniza
      }
    }

    return res.status(200).json({
      success: true,
      data: aplicacion,
    });
  } catch (error: any) {
    console.error('Get application error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Actualizar variables de entorno
 */
export const updateAplicacion = async (
  req: AuthRequest<{}, {}, UpdateAplicacionDTO>,
  res: Response<ApiResponse>
) => {
  try {
    const userId = req.user!.id;
    const {
      nombre,
      variablesEntorno,
      ramaBranch,
      puerto,
      installCommand,
      buildCommand,
      startCommand,
      baseDirectory,
      publishDirectory,
    } = req.body;

    const aplicacion = await prisma.aplicacion.findUnique({
      where: { userId },
    });

    if (!aplicacion) {
      return res.status(404).json({
        success: false,
        error: 'No application found',
      });
    }

    // Actualizar en Coolify si hay variables de entorno
    if (variablesEntorno && aplicacion.coolifyAppId) {
      try {
        await coolifyService.updateEnvironmentVariables(
          aplicacion.coolifyAppId,
          variablesEntorno
        );
      } catch (coolifyError: any) {
        return res.status(500).json({
          success: false,
          error: `Failed to update environment variables in Coolify: ${coolifyError.message}`,
        });
      }
    }

    // Actualizar en nuestra DB
    const updatedApp = await prisma.aplicacion.update({
      where: { id: aplicacion.id },
      data: {
        ...(nombre && { nombre }),
        ...(variablesEntorno && { variablesEntorno }),
        ...(ramaBranch && { ramaBranch }),
        ...(puerto !== undefined && { puerto }),
        ...(installCommand !== undefined && { installCommand }),
        ...(buildCommand !== undefined && { buildCommand }),
        ...(startCommand !== undefined && { startCommand }),
        ...(baseDirectory !== undefined && { baseDirectory }),
        ...(publishDirectory !== undefined && { publishDirectory }),
      },
    });

    return res.status(200).json({
      success: true,
      data: updatedApp,
      message: 'Application updated successfully',
    });
  } catch (error: any) {
    console.error('Update application error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Deployar/Redeploy la aplicación
 */
export const deployAplicacion = async (
  req: AuthRequest,
  res: Response<ApiResponse>
) => {
  try {
    const userId = req.user!.id;

    const aplicacion = await prisma.aplicacion.findUnique({
      where: { userId },
    });

    if (!aplicacion || !aplicacion.coolifyAppId) {
      return res.status(404).json({
        success: false,
        error: 'No application found',
      });
    }

    // Actualizar estado a DEPLOYING
    await prisma.aplicacion.update({
      where: { id: aplicacion.id },
      data: { estado: EstadoApp.DEPLOYING },
    });

    // Deployar en Coolify
    try {
      const deployment = await coolifyService.deployApplication(aplicacion.coolifyAppId);

      // Crear registro de deployment
      await prisma.deployment.create({
        data: {
          aplicacionId: aplicacion.id,
          version: new Date().toISOString(),
          estado: 'IN_PROGRESS',
        },
      });

      return res.status(200).json({
        success: true,
        data: deployment,
        message: 'Deployment started successfully',
      });
    } catch (coolifyError: any) {
      await prisma.aplicacion.update({
        where: { id: aplicacion.id },
        data: { estado: EstadoApp.FAILED },
      });

      return res.status(500).json({
        success: false,
        error: `Failed to deploy application: ${coolifyError.message}`,
      });
    }
  } catch (error: any) {
    console.error('Deploy application error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Detener la aplicación
 */
export const stopAplicacion = async (
  req: AuthRequest,
  res: Response<ApiResponse>
) => {
  try {
    const userId = req.user!.id;

    const aplicacion = await prisma.aplicacion.findUnique({
      where: { userId },
    });

    if (!aplicacion || !aplicacion.coolifyAppId) {
      return res.status(404).json({
        success: false,
        error: 'No application found',
      });
    }

    await coolifyService.stopApplication(aplicacion.coolifyAppId);

    await prisma.aplicacion.update({
      where: { id: aplicacion.id },
      data: { estado: EstadoApp.STOPPED },
    });

    return res.status(200).json({
      success: true,
      message: 'Application stopped successfully',
    });
  } catch (error: any) {
    console.error('Stop application error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to stop application',
    });
  }
};

/**
 * Reiniciar la aplicación
 */
export const restartAplicacion = async (
  req: AuthRequest,
  res: Response<ApiResponse>
) => {
  try {
    const userId = req.user!.id;

    const aplicacion = await prisma.aplicacion.findUnique({
      where: { userId },
    });

    if (!aplicacion || !aplicacion.coolifyAppId) {
      return res.status(404).json({
        success: false,
        error: 'No application found',
      });
    }

    await coolifyService.restartApplication(aplicacion.coolifyAppId);

    await prisma.aplicacion.update({
      where: { id: aplicacion.id },
      data: { estado: EstadoApp.RUNNING },
    });

    return res.status(200).json({
      success: true,
      message: 'Application restarted successfully',
    });
  } catch (error: any) {
    console.error('Restart application error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to restart application',
    });
  }
};

/**
 * Eliminar la aplicación (permite crear una nueva después)
 */
export const deleteAplicacion = async (
  req: AuthRequest,
  res: Response<ApiResponse>
) => {
  try {
    const userId = req.user!.id;

    const aplicacion = await prisma.aplicacion.findUnique({
      where: { userId },
    });

    if (!aplicacion) {
      return res.status(404).json({
        success: false,
        error: 'No application found',
      });
    }

    // Eliminar de Coolify si existe
    if (aplicacion.coolifyAppId) {
      try {
        await coolifyService.deleteApplication(aplicacion.coolifyAppId);
      } catch (coolifyError) {
        console.error('Error deleting from Coolify:', coolifyError);
        // Continuar con la eliminación local aunque falle en Coolify
      }
    }

    // Eliminar de nuestra DB (esto también elimina deployments por CASCADE)
    await prisma.aplicacion.delete({
      where: { id: aplicacion.id },
    });

    return res.status(200).json({
      success: true,
      message: 'Application deleted successfully. You can now create a new one.',
    });
  } catch (error: any) {
    console.error('Delete application error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete application',
    });
  }
};

/**
 * Obtener logs de la aplicación
 */
export const getAplicacionLogs = async (
  req: AuthRequest,
  res: Response<ApiResponse>
) => {
  try {
    const userId = req.user!.id;
    const lines = parseInt(req.query.lines as string) || 100;

    const aplicacion = await prisma.aplicacion.findUnique({
      where: { userId },
    });

    if (!aplicacion || !aplicacion.coolifyAppId) {
      return res.status(404).json({
        success: false,
        error: 'No application found',
      });
    }

    try {
      const logs = await coolifyService.getApplicationLogs(aplicacion.coolifyAppId, lines);

      return res.status(200).json({
        success: true,
        data: { logs },
      });
    } catch (logsError: any) {
      // Si la app no está corriendo todavía, devolver mensaje informativo
      if (logsError.message.includes('not running')) {
        return res.status(200).json({
          success: true,
          data: {
            logs: 'Application is still deploying. Logs will be available once the application is running.\n\nCurrent status: ' + aplicacion.estado
          },
        });
      }
      throw logsError;
    }
  } catch (error: any) {
    console.error('Get logs error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch logs',
    });
  }
};
