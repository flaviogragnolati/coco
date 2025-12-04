import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

import type { Provider } from "~/types/collab";

interface ProviderFilterProps {
  providers: Provider[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  includeAllOption?: boolean;
}

export function ProviderFilter({
  providers,
  value,
  onChange,
  placeholder = "Filtrar por proveedor",
  includeAllOption = true,
}: ProviderFilterProps) {
  return (
    <Select
      value={value ?? "all"}
      onValueChange={(selected) => {
        onChange(selected === "all" ? null : selected);
      }}
    >
      <SelectTrigger className="w-64">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAllOption ? <SelectItem value="all">Todos</SelectItem> : null}
        {providers.map((provider) => (
          <SelectItem key={provider.id} value={provider.id}>
            {provider.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
