import { UserRepository } from "../../domain/user/UerRepository.js";
import type { User } from "../../domain/user/User.js";
import { prisma } from "./PrismaClient.js";

export class PrismaUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const row = await prisma.user.findUnique({ where: { email } });
    if (!row) return null;
    return { id: row.id, email: row.email, name: row.name };
  }

  async upsertByEmail(input: { email: string; name: string }): Promise<User> {
    const row = await prisma.user.upsert({
      where: { email: input.email },
      update: { name: input.name },
      create: { email: input.email, name: input.name },
    });

    return { id: row.id, email: row.email, name: row.name };
  }
}
