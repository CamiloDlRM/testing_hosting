import { Request, Response } from 'express';
import { RegisterDTO, LoginDTO, ApiResponse } from '../types';
import prisma from '../utils/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';

/**
 * Registro de nuevo usuario
 */
export const register = async (
  req: Request<{}, {}, RegisterDTO>,
  res: Response<ApiResponse>
) => {
  try {
    const { email, password, nombre } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists',
      });
    }

    // Hash de la contraseña
    const hashedPassword = await hashPassword(password);

    // Crear usuario
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nombre,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        createdAt: true,
      },
    });

    // Generar token JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
    });

    return res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
      message: 'User registered successfully',
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during registration',
    });
  }
};

/**
 * Login de usuario
 */
export const login = async (
  req: Request<{}, {}, LoginDTO>,
  res: Response<ApiResponse>
) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Verificar contraseña
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Generar token JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
    });

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          createdAt: user.createdAt,
        },
        token,
      },
      message: 'Login successful',
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during login',
    });
  }
};

/**
 * Obtener información del usuario autenticado
 */
export const getMe = async (req: any, res: Response<ApiResponse>) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        createdAt: true,
        aplicacion: {
          select: {
            id: true,
            nombre: true,
            estado: true,
            repositorioGit: true,
            ultimoDeployment: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
