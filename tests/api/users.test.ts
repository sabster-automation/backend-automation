import { describe, it, expect } from 'vitest';
import { userService } from '../../src/services/UserService';
import { DataGenerator } from '../../src/core/utils/dataGenerator';
import { ApiError } from '../../src/core/http/ApiClient';

describe('Users API Endpoints', () => {
  it('should fetch list of users with pagination info', async () => {
    const res = await userService.getUsers({ page: 1, limit: 5 });

    expect(res.data.length).toBeGreaterThanOrEqual(1);
    expect(res.page).toBe(1);
    expect(res.limit).toBe(5);
    expect(res.total).toBeGreaterThanOrEqual(1);
    expect(res.data[0]).toHaveProperty('email');
  });

  it('should perform complete CRUD lifecycle for a user', async () => {
    // 1. CREATE
    const fakeUserData = DataGenerator.user();
    const created = await userService.createUser(fakeUserData);

    expect(created.id).toBeDefined();
    expect(created.name).toBe(fakeUserData.name);
    expect(created.email).toBe(fakeUserData.email);
    expect(created.role).toBe(fakeUserData.role);
    expect(created.department).toBe(fakeUserData.department);
    expect(created.isActive).toBe(true);

    // 2. READ
    const fetched = await userService.getUserById(created.id);
    expect(fetched.id).toBe(created.id);
    expect(fetched.email).toBe(created.email);

    // 3. UPDATE
    const updatedName = `${fakeUserData.name} (Updated)`;
    const updated = await userService.updateUser(created.id, {
      name: updatedName,
      role: 'editor',
    });
    expect(updated.name).toBe(updatedName);
    expect(updated.role).toBe('editor');
    expect(updated.updatedAt).toBeDefined();

    // 4. DELETE
    const deleteRes = await userService.deleteUser(created.id);
    expect(deleteRes.status).toBe(204);

    // 5. VERIFY DELETED
    await expect(userService.getUserById(created.id)).rejects.toThrow(ApiError);
  });

  it('should return 400 when creating user with invalid email format', async () => {
    const invalidUser = {
      name: 'Test Invalid',
      email: 'not-an-email',
      role: 'user' as const,
      department: 'QA',
      isActive: true,
    };

    try {
      await userService.createUser(invalidUser);
      expect.unreachable('Should have thrown ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
      expect(err.data).toEqual({ error: 'Invalid email address format' });
    }
  });

  it('should return 404 when querying non-existent user ID', async () => {
    try {
      await userService.getUserById('non-existent-user-id-999');
      expect.unreachable('Should have thrown 404 ApiError');
    } catch (err: any) {
      expect(err.status).toBe(404);
      expect(err.data).toEqual({ error: 'User not found' });
    }
  });
});
