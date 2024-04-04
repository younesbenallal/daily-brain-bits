"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { searchNotionDatabase } from "@/lib/integrations/notion";
import type { DatabaseObjectResponse, SearchResponse } from "@notionhq/client/build/src/api-endpoints";

type Option = Record<"value" | "label", string>;

export function MultiSelect({ defaultOptions }: { defaultOptions?: Option[] }) {
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [open, setOpen] = React.useState(false);
	const [selected, setSelected] = React.useState<Option[]>([]);
	const [inputValue, setInputValue] = React.useState("");
	const [options, setOptions] = React.useState<Option[]>(defaultOptions || []);

	const handleUnselect = React.useCallback((option: Option) => {
		setSelected((prev) => prev.filter((s) => s.value !== option.value));
	}, []);

	React.useEffect(() => {
		searchNotionDatabase(inputValue).then((data: SearchResponse | null) => {
			setOptions(
				data
					? data.results.map((result) => ({
							value: result.id,
							label: (result as DatabaseObjectResponse)?.title?.[0].plain_text,
					  }))
					: []
			);
		});
	}, [inputValue]);

	const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
		const input = inputRef.current;
		if (input) {
			if (e.key === "Delete" || e.key === "Backspace")
				if (input.value === "") {
					setSelected((prev) => {
						const newSelected = [...prev];
						newSelected.pop();
						return newSelected;
					});
				}

			// This is not a default behaviour of the <input /> field
			if (e.key === "Escape") input.blur();
		}
	}, []);

	const selectedOptions = options.filter((option) => !selected.includes(option));

	return (
		<Command onKeyDown={handleKeyDown} className="overflow-visible bg-transparent">
			<div className="px-3 py-2 text-sm border rounded-md group border-input ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
				<div className="flex flex-wrap gap-1">
					{selected.map((option) => {
						return (
							<Badge key={option.value} variant="secondary">
								{option.label}
								<button
									className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
									onKeyDown={(e) => e.key === "Enter" && handleUnselect(option)}
									onMouseDown={(e) => {
										e.preventDefault();
										e.stopPropagation();
									}}
									onClick={() => handleUnselect(option)}
								>
									<XMarkIcon className="w-3 h-3 text-muted-foreground hover:text-foreground" />
								</button>
							</Badge>
						);
					})}
					<CommandPrimitive.Input
						ref={inputRef}
						value={inputValue}
						onValueChange={setInputValue}
						onBlur={() => setOpen(false)}
						onFocus={() => setOpen(true)}
						placeholder="Select options..."
						className="flex-1 ml-2 bg-transparent outline-none placeholder:text-muted-foreground"
					/>
				</div>
			</div>
			<div className="relative mt-2">
				{open && selectedOptions.length > 0 ? (
					<div className="absolute top-0 z-10 w-full border rounded-md shadow-md outline-none bg-popover text-popover-foreground animate-in">
						<CommandGroup className="h-full overflow-auto">
							{selectedOptions.map((option) => {
								return (
									<CommandItem
										key={option.value}
										onMouseDown={(e) => {
											e.preventDefault();
											e.stopPropagation();
										}}
										onSelect={(value) => {
											setInputValue("");
											setSelected((prev) => [...prev, option]);
										}}
										className={"cursor-pointer"}
									>
										{option.label}
									</CommandItem>
								);
							})}
						</CommandGroup>
					</div>
				) : null}
			</div>
		</Command>
	);
}
