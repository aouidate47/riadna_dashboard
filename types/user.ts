export type UserRole = "OWNER" | "STAFF";

export interface User {
  id: string;
  riadId: string;
  name: string;
  email: string;
  role: UserRole;
}
