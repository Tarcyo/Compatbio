import type { User } from "./User.js";

export interface UserRepository {
  upsertByEmail(input: { email: string; name: string }): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
}
