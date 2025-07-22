import { auth } from "~/server/auth";
import {  HydrateClient } from "~/trpc/server";

export default async function Home() {
	const session = await auth();
	return (
		<HydrateClient>
			<main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
				<div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
					coco
				</div>
				<div className="text-center text-2xl">
					{session?.user ? `COCOOOOOOOO, ${session.user.name}!` : <LoginLink/>}
				</div>
			</main>
		</HydrateClient>
	);
}

function LoginLink() {
	return (
		<a
			href="/api/auth/signin"
			className="text-blue-500 hover:underline"
		>
			Log in
		</a>
	);
}