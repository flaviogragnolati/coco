import { Input } from "~/components/ui/input";

interface MultiplierInputProps {
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MultiplierInput({
  value,
  onChange,
  disabled = false,
  placeholder = "1",
}: MultiplierInputProps) {
  return (
    <Input
      type="number"
      value={value ?? ""}
      onChange={(e) => {
        const numValue = Number.parseFloat(e.target.value);
        onChange(Number.isNaN(numValue) ? 1 : numValue);
      }}
      disabled={disabled}
      placeholder={placeholder}
      min="0.01"
      step="0.01"
    />
  );
}
