import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { LoginForm } from "./_components/login-form";

function getSafeCallbackURL(value: string | string[] | undefined) {
	const candidate = Array.isArray(value) ? value[0] : value;

	if (!candidate) return "/";
	if (!candidate.startsWith("/") || candidate.startsWith("//")) return "/";
	if (candidate.includes("://")) return "/";

	return candidate;
}

export default async function LoginPage({
	searchParams,
}: {
	searchParams?: Promise<{ callbackURL?: string | string[] }>;
}) {
	const session = await getSession();
	const params = await searchParams;
	const callbackURL = getSafeCallbackURL(params?.callbackURL);

	if (session?.user) {
		redirect(callbackURL);
	}

	return (
		<main className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-md items-center px-4 py-8">
			<LoginForm callbackURL={callbackURL} />
		</main>
	);
}
