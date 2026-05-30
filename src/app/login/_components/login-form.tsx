"use client";

import { LogInIcon } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { authClient } from "~/server/better-auth/client";

function getSafeCallbackURL(value: string) {
	if (!value.startsWith("/") || value.startsWith("//")) return "/";
	if (value.includes("://")) return "/";
	return value;
}

export function LoginForm({ callbackURL = "/" }: { callbackURL?: string }) {
	const [error, setError] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);
	const safeCallbackURL = getSafeCallbackURL(callbackURL);

	const handleGoogleSignIn = async () => {
		setError(null);
		setIsPending(true);

		try {
			const response = await authClient.signIn.social({
				provider: "google",
				callbackURL: safeCallbackURL,
			});

			if (response?.error) {
				setError(response.error.message ?? "No se pudo iniciar sesion.");
				setIsPending(false);
			}
		} catch {
			setError("No se pudo iniciar sesion.");
			setIsPending(false);
		}
	};

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>Ingresar a Coco</CardTitle>
				<CardDescription>
					Usa tu cuenta de Google para acceder a la plataforma.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{error ? (
					<Alert variant="destructive">
						<AlertTitle>Error de autenticacion</AlertTitle>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				) : null}
				<Button disabled={isPending} onClick={handleGoogleSignIn} type="button">
					<LogInIcon data-icon="inline-start" />
					{isPending ? "Redirigiendo..." : "Continuar con Google"}
				</Button>
			</CardContent>
		</Card>
	);
}
