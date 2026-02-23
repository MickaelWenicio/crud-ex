export type UserRole = 'ADMIN' | 'USER';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  exp: number;
  iat: number;
}

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface Client {
  id: string;
  name: string;
  email: string;
  cnpj: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  address?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  salePrice: number | string;
  stock: number;
}

export interface ProductImage {
  id: string;
  productId: string;
  filename: string;
  path: string;
  mimeType: string;
  size: number;
  url?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number | string;
  subtotal: number | string;
  product?: Product;
}

export interface Order {
  id: string;
  clientId: string;
  createdByUserId: string;
  status: 'PENDING' | 'APPROVED' | 'CANCELLED';
  totalAmount: number | string;
  createdAt: string;
  client?: Client;
  items?: OrderItem[];
}

export interface UserEntity {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
