import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { env } from "~/env";
import { db } from "~/server/db";

export const auth = betterAuth({
	appName: "Coco",
	baseURL: env.BETTER_AUTH_URL,
	database: prismaAdapter(db, {
		provider: "postgresql", // or "sqlite" or "mysql"
	}),
	user: {
		additionalFields: {
			role: {
				type: ["user", "admin", "superadmin"],
				defaultValue: "user",
				input: false,
			},
			document: {
				type: "string",
				required: false,
				input: false,
			},
			taxId: {
				type: "string",
				required: false,
				input: false,
			},
			dob: {
				type: "date",
				required: false,
				input: false,
			},
			active: {
				type: "boolean",
				defaultValue: true,
				input: false,
			},
			deleted: {
				type: "boolean",
				defaultValue: false,
				input: false,
			},
		},
	},
	socialProviders: {
		google: {
			clientId: env.BETTER_AUTH_GOOGLE_CLIENT_ID,
			clientSecret: env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
		},
	},
});

export type Session = typeof auth.$Infer.Session;
