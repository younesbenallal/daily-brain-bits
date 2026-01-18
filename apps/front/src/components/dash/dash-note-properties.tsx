import { useMemo } from "react";

export type NotePropertiesProps = {
	properties: Record<string, unknown> | null | undefined;
};

type PropertyEntry = {
	key: string;
	value: string;
};

export function NoteProperties({ properties }: NotePropertiesProps) {
	const entries = useMemo(() => normalizeProperties(properties), [properties]);
	const hasProperties = entries.length > 0;

	return (
		<section className="space-y-3 border border-muted p-3 rounded-md">
			<div className="flex items-center justify-between text-sm text-muted-foreground">
				<span>Properties</span>
				<span>{hasProperties ? `${entries.length} fields` : "None"}</span>
			</div>
			{hasProperties ? (
				<div className="grid gap-3 sm:grid-cols-2">
					{entries.map((property) => (
						<div key={property.key}>
							<div className="text-[11px] font-semibold uppercase text-muted-foreground">{property.key}</div>
							<div className="mt-1 text-sm text-foreground">{property.value}</div>
						</div>
					))}
				</div>
			) : (
				<p className="text-sm text-muted-foreground italic">No properties available for this note.</p>
			)}
		</section>
	);
}

function normalizeProperties(properties: Record<string, unknown> | null | undefined): PropertyEntry[] {
	if (!properties) {
		return [];
	}
	const entries = Object.entries(properties)
		.map(([key, value]) => {
			const normalized = formatPropertyValue(value);
			if (!normalized) {
				return null;
			}
			return { key, value: normalized };
		})
		.filter((entry): entry is PropertyEntry => Boolean(entry));

	return entries.sort((a, b) => a.key.localeCompare(b.key));
}

function formatPropertyValue(value: unknown): string | null {
	if (value === null || value === undefined) {
		return null;
	}
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	}
	if (typeof value === "number") {
		return Number.isFinite(value) ? value.toString() : null;
	}
	if (typeof value === "boolean") {
		return value ? "Yes" : "No";
	}
	if (Array.isArray(value)) {
		const items = value.map((item) => formatPropertyValue(item)).filter((item): item is string => Boolean(item));
		return items.length > 0 ? items.join(", ") : null;
	}
	if (typeof value === "object") {
		try {
			const serialized = JSON.stringify(value);
			return serialized && serialized !== "{}" ? serialized : null;
		} catch {
			return null;
		}
	}
	return null;
}
