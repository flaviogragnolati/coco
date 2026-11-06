"use client";

import {
	GraduationCapIcon,
	HelpCircleIcon,
	MessageCircleIcon,
	RouteIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
	TUTORIAL_VERSIONS,
	tutorialHref,
	tutorialVersionMeta,
} from "~/features/tutorial/tutorial-script";

const versionIcons = { rapido: GraduationCapIcon, completo: RouteIcon };

export function HelpMenu() {
	const pathname = usePathname();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label="Ayuda"
				className={buttonVariants({
					size: "icon",
					variant: "ghost",
					className: "size-[42px] rounded-full",
				})}
				data-size="icon"
				data-slot="button"
				data-variant="ghost"
			>
				<HelpCircleIcon />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-60">
				<DropdownMenuGroup>
					{TUTORIAL_VERSIONS.map((version) => {
						const Icon = versionIcons[version];
						const meta = tutorialVersionMeta[version];
						return (
							<DropdownMenuItem asChild key={version}>
								<Link href={tutorialHref({ version, returnTo: pathname })}>
									<Icon />
									{meta.label} · {meta.duration}
								</Link>
							</DropdownMenuItem>
						);
					})}
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem asChild>
						<Link href="/#preguntas-frecuentes">
							<HelpCircleIcon />
							Preguntas frecuentes
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href="/#contacto">
							<MessageCircleIcon />
							Contacto
						</Link>
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
