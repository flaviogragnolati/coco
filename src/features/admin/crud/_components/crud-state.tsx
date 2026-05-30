import { AlertCircleIcon, InboxIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "~/components/ui/empty";
import { Skeleton } from "~/components/ui/skeleton";

export function CrudLoadingState({ rows = 6 }: { rows?: number }) {
	return (
		<div className="flex flex-col gap-2 rounded-none border p-3">
			{Array.from({ length: rows }).map((_, index) => (
				<Skeleton className="h-8 w-full" key={index.toString()} />
			))}
		</div>
	);
}

export function CrudEmptyState({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<Empty className="border">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<InboxIcon />
				</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{description}</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}

export function CrudErrorState({ message }: { message: string }) {
	return (
		<Alert variant="destructive">
			<AlertCircleIcon />
			<AlertTitle>No se pudo cargar la información</AlertTitle>
			<AlertDescription>{message}</AlertDescription>
		</Alert>
	);
}
