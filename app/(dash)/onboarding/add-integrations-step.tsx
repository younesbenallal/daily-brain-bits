"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";

import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { Label } from "@/components/ui/label";
import { NotionMetadata, UserWithIntegrations } from "@/types/db-ext";

interface AddIntegrationsStepProps extends React.ComponentPropsWithoutRef<"div"> {
	user: UserWithIntegrations;
}

export function AddIntegrationsStep({ user, ...props }: AddIntegrationsStepProps) {
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
				//setObsidianInfo(user.integrations.filter((integration) => integration.name === "obsidian"));
			}
		}, 500);
	};

	const notionIntegration = user.integrations?.find((integration) => integration?.tool_name === "notion");
	const notionWorkspace = notionIntegration?.metadata as NotionMetadata | undefined;

	return (
		<div className="space-y-8 ">
			<div>
				<h2>Gimme your preferences</h2>
				<p className="">Help us craft your experience to your wishes.</p>
			</div>
			<div className="flex flex-col w-fit mx-auto gap-3 p-24 items-stretch">
				{notionIntegration ? (
					<>
						<Button size="xl" variant="secondary" disabled>
							Connected to {notionWorkspace?.workspace_name}
						</Button>
					</>
				) : (
					<Button size="xl" variant="secondary" asChild>
						<Link
							href={`https://api.notion.com/v1/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_NOTION_CLIENT_ID}&response_type=code&owner=user&state=onboarding&redirect_uri=http%3A%2F%2Flocalhost%3A4000%2Fapi%2Fintegrations%2Fcallback`}
						>
							<Icons.notion className="w-6 h-6 mr-2" /> Notion
						</Link>
					</Button>
				)}

				<Button size="xl" variant="secondary" onClick={openObsidianPlugin}>
					<Icons.obsidian className="w-6 h-6 mr-2" /> Obsidian
				</Button>

				{showToken ? (
					<div className="mt-3">
						<Label>API Token</Label>
						<div className="relative w-full ">
							<Input className="hover:cursor-not-allowed" readOnly value={user.id} />
							<Button
								variant="secondary"
								size="icon"
								className="absolute right-0 inset-y-0 h-4 w-4 m-3 bg-secondary hover:bg-secondary/80"
								onClick={() => navigator.clipboard.writeText(user.id)}
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
