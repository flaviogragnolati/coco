import type { Prisma } from "../../~/prisma/client";

export function toPrismaInputJson(value: unknown): Prisma.InputJsonValue {
	return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
