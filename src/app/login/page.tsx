import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { LoginForm } from "./_components/login-form";

export default async function LoginPage() {
	const session = await getSession();

	if (session?.user) {
		redirect("/");
	}

	return (
		<main className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-md items-center px-4 py-8">
			<LoginForm />
		</main>
	);
}
