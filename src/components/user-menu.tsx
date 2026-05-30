"use client";

import { LogOutIcon, ShoppingBagIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { buttonVariants } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { authClient } from "~/server/better-auth/client";

type UserMenuProps = {
	user: {
		name: string;
		email: string;
		image?: string | null;
	};
};

function getInitials(name: string) {
	const initials = name
		.split(" ")
		.map((part) => part.at(0))
		.filter(Boolean)
		.slice(0, 2)
		.join("");

	return initials.toUpperCase() || "U";
}

export function UserMenu({ user }: UserMenuProps) {
	const router = useRouter();
	const [isSigningOut, setIsSigningOut] = useState(false);

	const handleSignOut = async () => {
		setIsSigningOut(true);

		try {
			await authClient.signOut();
			router.push("/login");
			router.refresh();
		} finally {
			setIsSigningOut(false);
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="Abrir menu de usuario"
				className={buttonVariants({ size: "icon", variant: "ghost" })}
				data-size="icon"
				data-slot="button"
				data-variant="ghost"
			>
				<Avatar size="sm">
					{user.image ? <AvatarImage alt={user.name} src={user.image} /> : null}
					<AvatarFallback>{getInitials(user.name)}</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel>
					<span className="block truncate font-medium text-foreground">
						{user.name}
					</span>
					<span className="block truncate">{user.email}</span>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem asChild>
						<Link href="/profile">
							<UserIcon />
							Perfil
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href="/my-operations">
							<ShoppingBagIcon />
							Ver mis operaciones
						</Link>
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						disabled={isSigningOut}
						onSelect={(event) => {
							event.preventDefault();
							void handleSignOut();
						}}
					>
						<LogOutIcon />
						{isSigningOut ? "Cerrando sesion..." : "Cerrar sesion"}
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
