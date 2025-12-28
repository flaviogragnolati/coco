import { MainNavbar } from "~/components/app/main-navbar";
import { auth } from "~/server/auth";

export async function AppNavbar() {
  const session = await auth();

  return <MainNavbar user={session?.user} />;
}
