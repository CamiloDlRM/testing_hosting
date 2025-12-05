import { Response } from 'express';
import { AuthRequest, CreateAplicacionDTO, UpdateAplicacionDTO, ApiResponse } from '../types';
import prisma from '../utils/prisma';
import coolifyService from '../services/coolify.service';
import { EstadoApp } from '@prisma/client';
import { generateDomain } from '../utils/domain';

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

    // VERIFICAR: El usuario solo puede tener un MÁXIMO de 2 aplicaciones
    const existingApps = await prisma.aplicacion.findMany({
      where: { userId },
    });

    if (existingApps.length >= 2) {
      return res.status(400).json({
        success: false,
        error: 'You already have 2 applications. Please delete one before creating a new one.',
      });
    }

    // Obtener el usuario para generar el dominio
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { nombre: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generar dominio: nombre_app.nombre_user.hostingroble.com
    const dominio = generateDomain(nombre, user.nombre);

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
        dominio, // Guardar el dominio generado
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
      // Solo incluir campos con valores para evitar nulls en thegameplan.json
      const coolifyConfig: any = {
        name: nombre,
        git_repository: repositorioGit,
        git_branch: ramaBranch || 'main',
        build_pack: buildPack,
        ports_exposes: puerto?.toString() || '3000',
        is_static: tipoApp === 'STATIC',
        domains: `https://${dominio}`, // IMPORTANTE: Agregar https:// para que Coolify lo configure correctamente
      };

      // Agregar campos opcionales solo si tienen valores
      if (installCommand) coolifyConfig.install_command = installCommand;
      if (buildCommand) coolifyConfig.build_command = buildCommand;
      if (startCommand) coolifyConfig.start_command = startCommand;
      if (baseDirectory) coolifyConfig.base_directory = baseDirectory;
      if (publishDirectory) coolifyConfig.publish_directory = publishDirectory;

      // Variables de entorno: agregar solo las del usuario
      // NO agregamos COOLIFY_URL ni COOLIFY_FQDN porque Coolify las agrega automáticamente con null
      if (variablesEntorno && Object.keys(variablesEntorno).length > 0) {
        coolifyConfig.environment_variables = variablesEntorno;
      }

      const coolifyApp = await coolifyService.createApplication(coolifyConfig);

      // Actualizar con el ID de Coolify
      const updatedApp = await prisma.aplicacion.update({
        where: { id: aplicacion.id },
        data: {
          coolifyAppId: coolifyApp.id,
          estado: EstadoApp.PENDING,
        },
      });

      // IMPORTANTE: Configurar variables de entorno DESPUÉS de crear la app
      // La API de Coolify no acepta env vars en el endpoint de creación
      if (variablesEntorno && Object.keys(variablesEntorno).length > 0) {
        try {
          console.log(`🔧 Configurando ${Object.keys(variablesEntorno).length} variables de entorno para app ${nombre}:`, variablesEntorno);
          await coolifyService.updateEnvironmentVariables(coolifyApp.id, variablesEntorno);
          console.log('✅ Variables de entorno configuradas correctamente');

          // Esperar 2 segundos para asegurar que Coolify procesó las variables
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (envError: any) {
          console.error('❌ Error al configurar variables de entorno:', envError.message);
          console.error('Response:', envError.response?.data);
          // No fallar la creación de la app por esto, el usuario puede configurarlas manualmente
        }
      }

      // Iniciar el deployment en Coolify automáticamente
      try {
        console.log(`🚀 Iniciando deployment de app ${nombre} (ID: ${coolifyApp.id})`);
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
 * Obtener todas las aplicaciones del usuario
 */
export const getMyAplicacion = async (
  req: AuthRequest,
  res: Response<ApiResponse>
) => {
  try {
    const userId = req.user!.id;

    const aplicaciones = await prisma.aplicacion.findMany({
      where: { userId },
      include: {
        deployments: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (aplicaciones.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No applications found',
      });
    }

    // Sincronizar estado con Coolify para cada aplicación
    for (const aplicacion of aplicaciones) {
      if (aplicacion.coolifyAppId) {
        try {
          const coolifyApp = await coolifyService.getApplication(aplicacion.coolifyAppId);

          // Log para debugging
          console.log(`📊 Estado de Coolify para app ${aplicacion.nombre}:`, {
            coolifyStatus: coolifyApp.status,
            currentStatus: aplicacion.estado,
            appId: aplicacion.coolifyAppId
          });

          // Mapear estado de Coolify a nuestro estado
          // Coolify puede devolver: running, running:unknown, running:healthy, exited, stopped, starting, restarting, deploying, failed
          let estadoActualizado = aplicacion.estado;
          const coolifyStatus = coolifyApp.status?.toLowerCase() || '';

          // IMPORTANTE: Coolify puede devolver "running:unknown", "running:healthy", etc.
          // Por eso usamos startsWith() en lugar de comparación exacta
          if (coolifyStatus.startsWith('running')) {
            estadoActualizado = EstadoApp.RUNNING;
          } else if (coolifyStatus.startsWith('exited')) {
            // IMPORTANTE: Coolify a veces muestra "exited" aunque la app esté corriendo
            // Si tiene dominio configurado y antes estaba RUNNING, asumir que sigue RUNNING
            if (aplicacion.dominio && aplicacion.estado === EstadoApp.RUNNING) {
              estadoActualizado = EstadoApp.RUNNING;
            } else {
              estadoActualizado = EstadoApp.STOPPED;
            }
          } else if (coolifyStatus.startsWith('stopped')) {
            estadoActualizado = EstadoApp.STOPPED;
          } else if (coolifyStatus.startsWith('starting') || coolifyStatus.startsWith('deploying')) {
            estadoActualizado = EstadoApp.DEPLOYING;
          } else if (coolifyStatus.startsWith('restarting')) {
            // Si está reiniciando, mantener como RUNNING ya que es funcional
            estadoActualizado = EstadoApp.RUNNING;
          } else if (coolifyStatus.startsWith('failed') || coolifyStatus.startsWith('error')) {
            estadoActualizado = EstadoApp.FAILED;
          }

          console.log(`🔄 Actualizando estado: ${aplicacion.estado} → ${estadoActualizado}`);

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
    }

    return res.status(200).json({
      success: true,
      data: aplicaciones, // Ahora devuelve un array
    });
  } catch (error: any) {
    console.error('Get applications error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

/**
 * Actualizar variables de entorno de una aplicación específica
 */
export const updateAplicacion = async (
  req: AuthRequest<{ appId: string }, {}, UpdateAplicacionDTO>,
  res: Response<ApiResponse>
) => {
  try {
    const userId = req.user!.id;
    const { appId } = req.params;
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

    // Verificar que la aplicación existe y pertenece al usuario
    const aplicacion = await prisma.aplicacion.findFirst({
      where: {
        id: appId,
        userId,
      },
    });

    if (!aplicacion) {
      return res.status(404).json({
        success: false,
        error: 'Application not found or does not belong to you',
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
 * Deployar/Redeploy una aplicación específica
 */
export const deployAplicacion = async (
  req: AuthRequest<{ appId: string }>,
  res: Response<ApiResponse>
) => {
  try {
    const userId = req.user!.id;
    const { appId } = req.params;

    const aplicacion = await prisma.aplicacion.findFirst({
      where: {
        id: appId,
        userId,
      },
    });

    if (!aplicacion || !aplicacion.coolifyAppId) {
      return res.status(404).json({
        success: false,
        error: 'Application not found or does not belong to you',
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
 * Detener una aplicación específica
 */
export const stopAplicacion = async (
  req: AuthRequest<{ appId: string }>,
  res: Response<ApiResponse>
) => {
  try {
    const userId = req.user!.id;
    const { appId } = req.params;

    const aplicacion = await prisma.aplicacion.findFirst({
      where: {
        id: appId,
        userId,
      },
    });

    if (!aplicacion || !aplicacion.coolifyAppId) {
      return res.status(404).json({
        success: false,
        error: 'Application not found or does not belong to you',
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
 * Reiniciar una aplicación específica
 */
export const restartAplicacion = async (
  req: AuthRequest<{ appId: string }>,
  res: Response<ApiResponse>
) => {
  try {
    const userId = req.user!.id;
    const { appId } = req.params;

    const aplicacion = await prisma.aplicacion.findFirst({
      where: {
        id: appId,
        userId,
      },
    });

    if (!aplicacion || !aplicacion.coolifyAppId) {
      return res.status(404).json({
        success: false,
        error: 'Application not found or does not belong to you',
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
 * Eliminar una aplicación específica
 */
export const deleteAplicacion = async (
  req: AuthRequest<{ appId: string }>,
  res: Response<ApiResponse>
) => {
  try {
    const userId = req.user!.id;
    const { appId } = req.params;

    const aplicacion = await prisma.aplicacion.findFirst({
      where: {
        id: appId,
        userId,
      },
    });

    if (!aplicacion) {
      return res.status(404).json({
        success: false,
        error: 'Application not found or does not belong to you',
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
 * Obtener logs de una aplicación específica
 */
export const getAplicacionLogs = async (
  req: AuthRequest<{ appId: string }>,
  res: Response<ApiResponse>
) => {
  try {
    const userId = req.user!.id;
    const { appId } = req.params;
    const lines = parseInt(req.query.lines as string) || 100;

    const aplicacion = await prisma.aplicacion.findFirst({
      where: {
        id: appId,
        userId,
      },
    });

    if (!aplicacion || !aplicacion.coolifyAppId) {
      return res.status(404).json({
        success: false,
        error: 'Application not found or does not belong to you',
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
