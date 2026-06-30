import { Badge } from "~/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import type { StatusConfig } from "~/shared/common/admin-crud/status-config";

export function StatusChip({
	config,
	className,
}: {
	config: StatusConfig;
	className?: string;
}) {
	const Icon = config.icon;

	const chip = (
		<Badge className={className} variant={config.variant}>
			{Icon ? <Icon data-icon="inline-start" /> : null}
			{config.label}
		</Badge>
	);

	if (!config.hint) return chip;

	return (
		<Tooltip>
			<TooltipTrigger asChild>{chip}</TooltipTrigger>
			<TooltipContent>{config.hint}</TooltipContent>
		</Tooltip>
	);
}
