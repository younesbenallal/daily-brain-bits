import React, { useId } from "react";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";

interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  className?: string;
  id?: string;
}

const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
  className = "",
  id,
}) => {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <Label
          htmlFor={selectId}
          className="text-gray-dark text-sm font-medium"
        >
          {label}
        </Label>
      )}
      <SelectNative
        id={selectId}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
          onChange(e.target.value)
        }
        className={className}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </SelectNative>
    </div>
  );
};

export default Select;
