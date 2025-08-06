
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type LoginInput } from '../schema';
import { createUser, loginUser, getCurrentUser } from '../handlers/auth';
import { eq } from 'drizzle-orm';

const testUserInput: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  role: 'manager',
  permissions: ['read_clients', 'write_clients'],
  is_active: true
};

const testLoginInput: LoginInput = {
  username: 'testuser',
  password: 'password123'
};

describe('Auth Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createUser', () => {
    it('should create a user', async () => {
      const result = await createUser(testUserInput);

      expect(result.username).toEqual('testuser');
      expect(result.email).toEqual('test@example.com');
      expect(result.role).toEqual('manager');
      expect(result.permissions).toEqual(['read_clients', 'write_clients']);
      expect(result.is_active).toEqual(true);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
      expect(result.password_hash).toBeDefined();
    });

    it('should save user to database', async () => {
      const result = await createUser(testUserInput);

      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, result.id))
        .execute();

      expect(users).toHaveLength(1);
      expect(users[0].username).toEqual('testuser');
      expect(users[0].email).toEqual('test@example.com');
      expect(users[0].role).toEqual('manager');
      expect(users[0].is_active).toEqual(true);
      expect(users[0].permissions).toEqual('["read_clients","write_clients"]');
    });

    it('should create user without permissions', async () => {
      const inputWithoutPermissions: CreateUserInput = {
        username: 'nopermuser',
        email: 'noperm@example.com',
        password: 'password123',
        role: 'collector',
        is_active: true
      };

      const result = await createUser(inputWithoutPermissions);

      expect(result.username).toEqual('nopermuser');
      expect(result.permissions).toBeNull();
    });

    it('should throw error for duplicate username', async () => {
      await createUser(testUserInput);

      const duplicateInput: CreateUserInput = {
        ...testUserInput,
        email: 'different@example.com'
      };

      expect(createUser(duplicateInput)).rejects.toThrow();
    });

    it('should throw error for duplicate email', async () => {
      await createUser(testUserInput);

      const duplicateInput: CreateUserInput = {
        ...testUserInput,
        username: 'differentuser'
      };

      expect(createUser(duplicateInput)).rejects.toThrow();
    });
  });

  describe('loginUser', () => {
    it('should login with valid credentials', async () => {
      // Create user first
      await createUser(testUserInput);

      const result = await loginUser(testLoginInput);

      expect(result).not.toBeNull();
      expect(result!.user.username).toEqual('testuser');
      expect(result!.user.email).toEqual('test@example.com');
      expect(result!.user.role).toEqual('manager');
      expect(result!.user.permissions).toEqual(['read_clients', 'write_clients']);
      expect(result!.token).toBeDefined();
      expect(typeof result!.token).toBe('string');
    });

    it('should return null for invalid username', async () => {
      await createUser(testUserInput);

      const invalidLogin: LoginInput = {
        username: 'nonexistent',
        password: 'password123'
      };

      const result = await loginUser(invalidLogin);
      expect(result).toBeNull();
    });

    it('should return null for invalid password', async () => {
      await createUser(testUserInput);

      const invalidLogin: LoginInput = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      const result = await loginUser(invalidLogin);
      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      const inactiveUserInput: CreateUserInput = {
        ...testUserInput,
        username: 'inactiveuser',
        email: 'inactive@example.com',
        is_active: false
      };

      await createUser(inactiveUserInput);

      const loginInput: LoginInput = {
        username: 'inactiveuser',
        password: 'password123'
      };

      const result = await loginUser(loginInput);
      expect(result).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should get user by ID', async () => {
      const createdUser = await createUser(testUserInput);

      const result = await getCurrentUser(createdUser.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(createdUser.id);
      expect(result!.username).toEqual('testuser');
      expect(result!.email).toEqual('test@example.com');
      expect(result!.role).toEqual('manager');
      expect(result!.permissions).toEqual(['read_clients', 'write_clients']);
      expect(result!.is_active).toEqual(true);
    });

    it('should return null for non-existent user ID', async () => {
      const result = await getCurrentUser(999);
      expect(result).toBeNull();
    });

    it('should get user with null permissions', async () => {
      const inputWithoutPermissions: CreateUserInput = {
        username: 'nopermuser',
        email: 'noperm@example.com',
        password: 'password123',
        role: 'collector',
        is_active: true
      };

      const createdUser = await createUser(inputWithoutPermissions);
      const result = await getCurrentUser(createdUser.id);

      expect(result).not.toBeNull();
      expect(result!.permissions).toBeNull();
    });
  });
});
