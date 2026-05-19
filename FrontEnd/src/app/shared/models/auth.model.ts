export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  documentType?: string;
  documentNumber?: string;
}

export interface LoginResponse {
  token: string;
  userId: string;
  email: string;
  roles: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  documentNumber?: string;
}
