import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

interface WeekSelectorProps {
  value: number;
  onChange: (value: number) => void;
  weeks?: number[];
}

const defaultWeeks = Array.from({ length: 6 }, (_, index) => index + 1);

export function WeekSelector({
  value,
  onChange,
  weeks = defaultWeeks,
}: WeekSelectorProps) {
  return (
    <Select
      value={String(value)}
      onValueChange={(selected) => onChange(Number.parseInt(selected, 10))}
    >
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Semana" />
      </SelectTrigger>
      <SelectContent>
        {weeks.map((week) => (
          <SelectItem key={week} value={String(week)}>
            Semana {week}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
