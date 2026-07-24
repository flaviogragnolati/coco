import type { Metadata } from "next";
import { UserCrudClient } from "./_components/user-crud-client";

export const metadata: Metadata = {
	title: "Usuarios",
};

export default function UsersCrudPage() {
	return <UserCrudClient />;
}
