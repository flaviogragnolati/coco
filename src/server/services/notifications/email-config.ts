import { z } from "zod";

export type EmailConfig = {
	environment: string;
	dispatch: boolean;
	from: string;
	origin: string;
	testRecipient?: string;
};

export function getEmailEnvironment(
	source: Readonly<Record<string, string | undefined>> = process.env,
): string | null {
	const mode = source.CUSTOMER_EMAIL_MODE ?? "off";
	if (mode === "off") return null;
	if (mode !== "test" && mode !== "live") {
		throw new Error("CUSTOMER_EMAIL_MODE debe ser off, test o live.");
	}
	if (
		mode === "live" &&
		(source.APP_ENV !== "production" ||
			(source.VERCEL_ENV && source.VERCEL_ENV !== "production"))
	) {
		throw new Error("El envío a clientes requiere un entorno de producción.");
	}

	const partition = z
		.string()
		.regex(/^[a-z0-9-]{1,64}$/)
		.parse(source.CUSTOMER_EMAIL_ENVIRONMENT);
	return `${mode}/${partition}`;
}

export const emailProviderSchema = z.enum(["resend", "gmail"]);
type DispatchConfig = EmailConfig & {
	provider: z.infer<typeof emailProviderSchema>;
	credential?: string;
};

export function getEmailConfig(
	source: Readonly<Record<string, string | undefined>> = process.env,
): DispatchConfig | null {
	const environment = getEmailEnvironment(source);
	if (!environment) return null;
	const mode = source.CUSTOMER_EMAIL_MODE;
	const dispatch =
		z
			.enum(["true", "false"])
			.default("false")
			.parse(source.CUSTOMER_EMAIL_DISPATCH) === "true";
	const origin = z.httpUrl().parse(source.BETTER_AUTH_URL);
	if (mode === "live" && !origin.startsWith("https://"))
		throw new Error("El enlace de producción requiere HTTPS.");
	const provider = emailProviderSchema
		.default("resend")
		.parse(source.CUSTOMER_EMAIL_PROVIDER);
	const gmail = provider === "gmail";
	return {
		provider,
		environment,
		dispatch,
		from: z.email().parse(gmail ? source.GMAIL_USER : source.RESEND_FROM),
		origin: new URL(origin).origin,
		credential: dispatch
			? gmail
				? z
						.string()
						.transform((v) => v.replace(/\s/g, ""))
						.pipe(z.string().length(16))
						.parse(source.GMAIL_APP_PASSWORD)
				: z.string().min(1).parse(source.RESEND_API_KEY)
			: undefined,
		testRecipient:
			mode === "test"
				? z.email().parse(source.CUSTOMER_EMAIL_TEST_TO)
				: undefined,
	};
}
