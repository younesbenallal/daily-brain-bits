import { createFileRoute } from "@tanstack/react-router";
import { EmailClientMockup } from "@/components/mockups/email-client";
import { NoteCardMockup } from "@/components/mockups/note-card";
import { FocusPromptsMockup } from "@/components/mockups/focus-prompts";
import { SourceConnectionMockup } from "@/components/mockups/source-connection";
import { SyncDashboardMockup } from "@/components/mockups/sync-dashboard";
import { SpacedRepetitionMockup } from "@/components/mockups/spaced-repetition";
import { CalendarScheduleMockup } from "@/components/mockups/calendar-schedule";
import { MobileEmailMockup } from "@/components/mockups/mobile-email";
import { NoteSelectionMockup } from "@/components/mockups/note-selection";

export const Route = createFileRoute("/mockups")({
	component: MockupsPage,
});

const mockups = [
	{
		id: "email-client",
		title: "Email Client",
		description: "Daily Brain Bits email in an inbox",
		component: EmailClientMockup,
		bgColor: "bg-gradient-to-br from-slate-100 to-slate-200",
	},
	{
		id: "note-card",
		title: "Note Card with Quiz",
		description: "Interactive note with quiz options",
		component: NoteCardMockup,
		bgColor: "bg-gradient-to-br from-blue-50 to-indigo-100",
	},
	{
		id: "focus-prompts",
		title: "Focus Prompts",
		description: "User focus priorities",
		component: FocusPromptsMockup,
		bgColor: "bg-gradient-to-br from-sky-50 to-cyan-100",
	},
	{
		id: "source-connection",
		title: "Source Connection",
		description: "Notion & Obsidian integration",
		component: SourceConnectionMockup,
		bgColor: "bg-gradient-to-br from-violet-50 to-purple-100",
	},
	{
		id: "sync-dashboard",
		title: "Sync Dashboard",
		description: "Notes sync progress stats",
		component: SyncDashboardMockup,
		bgColor: "bg-gradient-to-br from-emerald-50 to-teal-100",
	},
	{
		id: "spaced-repetition",
		title: "Spaced Repetition",
		description: "Memory retention curve",
		component: SpacedRepetitionMockup,
		bgColor: "bg-gradient-to-br from-amber-50 to-orange-100",
	},
	{
		id: "calendar-schedule",
		title: "Digest Schedule",
		description: "Weekly delivery calendar",
		component: CalendarScheduleMockup,
		bgColor: "bg-gradient-to-br from-rose-50 to-pink-100",
	},
	{
		id: "mobile-email",
		title: "Mobile Email",
		description: "Digest on iPhone",
		component: MobileEmailMockup,
		bgColor: "bg-gradient-to-br from-slate-50 to-zinc-100",
	},
	{
		id: "note-selection",
		title: "Note Selection",
		description: "Smart note picking",
		component: NoteSelectionMockup,
		bgColor: "bg-gradient-to-br from-fuchsia-50 to-pink-100",
	},
];

function MockupsPage() {
	return (
		<div className="min-h-screen bg-background p-8">
			<div className="mx-auto max-w-7xl">
				<header className="mb-12">
					<h1 className="text-4xl font-bold text-foreground">Marketing Mockups</h1>
					<p className="mt-2 text-lg text-muted-foreground">Feature illustrations for landing pages and marketing materials</p>
				</header>

				<div className="grid gap-8">
					{mockups.map((mockup) => (
						<MockupRow key={mockup.id} {...mockup} />
					))}
				</div>
			</div>
		</div>
	);
}

function MockupRow({
	title,
	description,
	component: Component,
	bgColor,
}: {
	title: string;
	description: string;
	component: React.ComponentType;
	bgColor: string;
}) {
	return (
		<div className="rounded-2xl border border-border/50 bg-card p-6">
			<div className="mb-4">
				<h2 className="text-xl font-semibold text-foreground">{title}</h2>
				<p className="text-sm text-muted-foreground">{description}</p>
			</div>

			<div className="grid grid-cols-2 gap-6">
				{/* Raw component */}
				<div className="flex items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/20 p-8">
					<Component />
				</div>

				{/* Component in context */}
				<div className={`flex items-center justify-center rounded-xl ${bgColor} p-8`}>
					<div className="translate-x-2 translate-y-2 rotate-1 transform transition-transform hover:rotate-0 hover:translate-x-0 hover:translate-y-0">
						<Component />
					</div>
				</div>
			</div>
		</div>
	);
}
