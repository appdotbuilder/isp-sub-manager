
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type CreateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

// Simple password hashing (in production, use bcrypt)
function hashPassword(password: string): string {
  // This is a simple hash for demo purposes
  // In production, use bcrypt or similar
  return Buffer.from(password).toString('base64');
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Simple JWT-like token generation (in production, use proper JWT library)
function generateToken(payload: { userId: number; username: string; role: string }): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + (24 * 60 * 60) // 24 hours
  };
  
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
  
  return `${headerB64}.${payloadB64}.signature`;
}

export async function loginUser(input: LoginInput): Promise<{ user: User; token: string } | null> {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      return null;
    }

    const user = users[0];

    // Verify password
    if (!verifyPassword(input.password, user.password_hash)) {
      return null;
    }

    // Check if user is active
    if (!user.is_active) {
      return null;
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    // Parse permissions from JSON string
    const permissions = user.permissions ? JSON.parse(user.permissions) : null;

    const userResponse: User = {
      id: user.id,
      username: user.username,
      email: user.email,
      password_hash: user.password_hash,
      role: user.role,
      permissions,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    return { user: userResponse, token };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Hash the password
    const password_hash = hashPassword(input.password);

    // Convert permissions array to JSON string for storage
    const permissionsJson = input.permissions ? JSON.stringify(input.permissions) : null;

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        password_hash,
        role: input.role,
        permissions: permissionsJson,
        is_active: input.is_active
      })
      .returning()
      .execute();

    const user = result[0];

    // Parse permissions back to array for response
    const permissions = user.permissions ? JSON.parse(user.permissions) : null;

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      password_hash: user.password_hash,
      role: user.role,
      permissions,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}

export async function getCurrentUser(userId: number): Promise<User | null> {
  try {
    // Find user by ID
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      return null;
    }

    const user = users[0];

    // Parse permissions from JSON string
    const permissions = user.permissions ? JSON.parse(user.permissions) : null;

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      password_hash: user.password_hash,
      role: user.role,
      permissions,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Get current user failed:', error);
    throw error;
  }
}
