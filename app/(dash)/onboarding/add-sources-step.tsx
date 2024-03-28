"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";

import type { User } from "@/db/schema";
import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { Label } from "@/components/ui/label";

interface AddSourcesStepProps extends React.ComponentPropsWithoutRef<"div"> {
	user: User;
}

export function AddSourcesStep({ user, ...props }: AddSourcesStepProps) {
	const [showToken, setShowToken] = React.useState(false);
	const [obsidianInfo, setObsidianInfo] = React.useState("");

	const openObsidianPlugin = () => {
		setShowToken(true);

		setInterval(async () => {
			const result = await fetch("localhost:4000/api/users/" + user.id, {
				method: "GET",
			});
			if (result.ok) {
				const user = await result.json();
				setObsidianInfo(user.sources.filter((source) => source.name === "obsidian"));
			}
		}, 500);
	};
	return (
		<div className="space-y-8 ">
			<div>
				<h2>Gimme your preferences</h2>
				<p className="text-muted">Help us craft your experience to your wishes.</p>
			</div>
			<div className="flex flex-col w-fit mx-auto  gap-3 p-24 items-stretch">
				<Button size="xl" variant="secondary">
					<Icons.notion className="w-6 h-6 mr-2" /> Notion
				</Button>

				<Button size="xl" variant="secondary" onClick={openObsidianPlugin}>
					<Icons.obsidian className="w-6 h-6 mr-2" /> Obsidian
				</Button>

				{showToken ? (
					<div className="mt-3">
						<Label>API Token</Label>
						<div className="relative w-full ">
							<Input className="hover:cursor-not-allowed" readOnly value={user.apiKey} />
							<Button
								variant="secondary"
								size="icon"
								className="absolute right-0 inset-y-0 h-4 w-4 m-3 bg-white"
								onClick={() => navigator.clipboard.writeText(user.apiKey)}
							>
								<DocumentDuplicateIcon className="text-muted-foreground" />
							</Button>
						</div>
					</div>
				) : (
					<></>
				)}
			</div>
		</div>
	);
}
