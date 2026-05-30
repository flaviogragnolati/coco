import { requireUser } from "~/server/auth/route-guards";
import { api } from "~/trpc/server";
import { ProfileForm } from "./_components/profile-form";

export default async function ProfilePage() {
	await requireUser();
	const profile = await api.profile.get();

	return (
		<main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
			<section className="flex flex-col gap-2">
				<h1 className="font-heading font-semibold text-2xl tracking-normal">
					Perfil
				</h1>
				<p className="text-muted-foreground text-sm/relaxed">
					Administra tus datos personales y tributarios.
				</p>
			</section>

			<ProfileForm
				profile={{
					...profile,
					dob: profile.dob ? profile.dob.toISOString() : null,
				}}
			/>
		</main>
	);
}
