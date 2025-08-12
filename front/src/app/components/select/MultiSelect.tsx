import { useState } from "react";

import { Label } from "@/components/ui/label";
import MultipleSelector, { Option } from "@/components/ui/multiselect";

const frameworks: Option[] = [
  {
    value: "next.js",
    label: "Next.js",
  },
  {
    value: "sveltekit",
    label: "SvelteKit",
  },
  {
    value: "nuxt.js",
    label: "Nuxt.js",
    disable: true,
  },
  {
    value: "remix",
    label: "Remix",
  },
  {
    value: "astro",
    label: "Astro",
  },
  {
    value: "angular",
    label: "Angular",
  },
  {
    value: "vue",
    label: "Vue.js",
  },
  {
    value: "react",
    label: "React",
  },
  {
    value: "ember",
    label: "Ember.js",
  },
  {
    value: "gatsby",
    label: "Gatsby",
  },
  {
    value: "eleventy",
    label: "Eleventy",
    disable: true,
  },
  {
    value: "solid",
    label: "SolidJS",
  },
  {
    value: "preact",
    label: "Preact",
  },
  {
    value: "qwik",
    label: "Qwik",
  },
  {
    value: "alpine",
    label: "Alpine.js",
  },
  {
    value: "lit",
    label: "Lit",
  },
];

interface MultiSelectProps {
  options: Option[];
  placeholder: string;
  label: string;
  value?: Option[];
  onChange?: (value: Option[]) => void;
}

export default function MultiSelect({
  options,
  placeholder,
  label,
  value,
  onChange,
}: MultiSelectProps) {
  const [selectedOptions, setSelectedOptions] = useState<Option[]>(value || []);

  const handleChange = (newOptions: Option[]) => {
    setSelectedOptions(newOptions);
    onChange?.(newOptions);
  };

  return (
    <div className="*:not-first:mt-2">
      <Label>{label}</Label>
      <MultipleSelector
        commandProps={{
          label: label,
        }}
        value={selectedOptions}
        defaultOptions={options}
        placeholder={placeholder}
        hideClearAllButton
        hidePlaceholderWhenSelected
        emptyIndicator={<p className="text-center text-sm">No results found</p>}
        onChange={handleChange}
      />
    </div>
  );
}
