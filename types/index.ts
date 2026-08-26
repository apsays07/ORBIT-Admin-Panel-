export * from "./ipo";
export * from "./gmp";
export * from "./logo";
export * from "./application";
export * from "./member";
export * from "./audit";
export * from "./security";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "superadmin" | "admin" | "moderator";
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export type DbConnectionStatus = "connected" | "disconnected" | "missing_config";
