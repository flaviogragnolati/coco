import { useCallback } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  minFraction?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function QuantityInput({
  value,
  onChange,
  minFraction = 1,
  min = minFraction,
  max,
  disabled = false,
}: QuantityInputProps) {
  const handleChange = useCallback(
    (next: number) => {
      if (Number.isNaN(next)) return;
      if (max !== undefined && next > max) return;
      if (next < min) return;
      if (next % minFraction !== 0) return;
      onChange(next);
    },
    [onChange, min, max, minFraction],
  );

  const increment = () => handleChange(value + minFraction);
  const decrement = () => handleChange(value - minFraction);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={decrement}
        disabled={disabled || value <= min}
      >
        -
      </Button>
      <Input
        type="number"
        className="w-20 text-center"
        value={value}
        disabled={disabled}
        onChange={(event) => handleChange(Number.parseInt(event.target.value, 10))}
      />
      <Button
        variant="outline"
        size="icon"
        onClick={increment}
        disabled={disabled || (max !== undefined && value >= max)}
      >
        +
      </Button>
    </div>
  );
}
