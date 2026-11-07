import { ApiClient, defaultApiClient, ApiResponse } from '../core/http/ApiClient';
import { assertSchema } from '../core/utils/schemaValidator';
import {
  User,
  UserSchema,
  CreateUserRequest,
  UpdateUserRequest,
  UserListResponse,
  UserListResponseSchema,
} from '../schemas/user.schema';

export class UserService {
  constructor(private client: ApiClient = defaultApiClient) {}

  public async getUsers(params: { page?: number; limit?: number; search?: string } = {}): Promise<UserListResponse> {
    const response = await this.client.get<UserListResponse>('/api/v1/users', {
      params,
    });
    return assertSchema(UserListResponseSchema, response.data, 'UserListResponse');
  }

  public async getUserById(userId: string): Promise<User> {
    const response = await this.client.get<User>(`/api/v1/users/${userId}`);
    return assertSchema(UserSchema, response.data, 'User');
  }

  public async createUser(payload: CreateUserRequest): Promise<User> {
    const response = await this.client.post<User>('/api/v1/users', payload);
    return assertSchema(UserSchema, response.data, 'CreatedUser');
  }

  public async updateUser(userId: string, payload: UpdateUserRequest): Promise<User> {
    const response = await this.client.put<User>(`/api/v1/users/${userId}`, payload);
    return assertSchema(UserSchema, response.data, 'UpdatedUser');
  }

  public async deleteUser(userId: string): Promise<ApiResponse<void>> {
    return this.client.delete<void>(`/api/v1/users/${userId}`);
  }
}

export const userService = new UserService();
