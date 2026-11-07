import { z } from 'zod';

export const UserRoleSchema = z.enum(['admin', 'user', 'editor']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  email: z.string().email(),
  role: UserRoleSchema,
  department: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const CreateUserRequestSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: UserRoleSchema,
  department: z.string().min(2),
  isActive: z.boolean().default(true),
});
export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

export const UpdateUserRequestSchema = CreateUserRequestSchema.partial();
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;

export const UserListResponseSchema = z.object({
  total: z.number().nonnegative(),
  page: z.number().positive(),
  limit: z.number().positive(),
  data: z.array(UserSchema),
});
export type UserListResponse = z.infer<typeof UserListResponseSchema>;
