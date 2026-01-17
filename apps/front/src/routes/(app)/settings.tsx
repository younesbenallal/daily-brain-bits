import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { AppLayout } from "@/components/layouts/app-layout";
import { cn } from "@/lib/utils";

const settingsSearchSchema = z.object({
	tab: z.enum(["app", "account", "billing"]).default("app"),
});

export const Route = createFileRoute("/(app)/settings")({
	validateSearch: (search) => settingsSearchSchema.parse(search),
	component: SettingsPage,
});

function SettingsPage() {
	const { tab } = Route.useSearch();

	return (
		<AppLayout maxWidth="max-w-[800px]">
			<div className="flex flex-col gap-8">
				<div>
					<h1 className="font-display text-3xl font-semibold text-primary">Settings</h1>
					<p className="mt-1 text-muted-foreground">Manage your application preferences and account details.</p>
				</div>

				<div className="flex gap-1 border-b border-border pb-px">
					{["app", "account", "billing"].map((t) => (
						<Link
							key={t}
							to="/settings"
							search={{ tab: t as any }}
							className={cn(
								"relative px-4 py-2 text-sm font-medium transition-colors",
								tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground",
							)}
						>
							{t.charAt(0).toUpperCase() + t.slice(1)}
						</Link>
					))}
				</div>

				<div className="mt-4">
					{tab === "app" && <AppSettings />}
					{tab === "account" && <AccountSettings />}
					{tab === "billing" && <BillingSettings />}
				</div>
			</div>
		</AppLayout>
	);
}

function AppSettings() {
	return (
		<div className="space-y-6">
			<div className="space-y-4">
				<h3 className="text-lg font-medium">Preferences</h3>
				<div className="grid gap-4">
					<div className="flex items-center justify-between rounded-lg border p-4">
						<div>
							<div className="font-medium">Email Frequency</div>
							<div className="text-sm text-muted-foreground">How often should we send you digest emails?</div>
						</div>
						<select className="rounded border bg-background px-2 py-1">
							<option>Daily</option>
							<option>Weekly</option>
							<option>Twice a week</option>
						</select>
					</div>
					<div className="flex items-center justify-between rounded-lg border p-4">
						<div>
							<div className="font-medium">AI Model</div>
							<div className="text-sm text-muted-foreground">Choose the LLM for generating your quizzes.</div>
						</div>
						<select className="rounded border bg-background px-2 py-1">
							<option>GPT-4o (Recommended)</option>
							<option>Claude 3.5 Sonnet</option>
							<option>GPT-3.5 Turbo</option>
						</select>
					</div>
				</div>
			</div>
		</div>
	);
}

function AccountSettings() {
	return (
		<div className="space-y-6">
			<div className="space-y-4">
				<h3 className="text-lg font-medium">Account Details</h3>
				<div className="grid gap-4">
					<div className="space-y-2">
						<label className="text-sm font-medium">Email Address</label>
						<input className="w-full rounded-lg border bg-background px-3 py-2" value="user@example.com" disabled />
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium">Password</label>
						<button type="button" className="flex w-fit items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent">
							Change Password
						</button>
					</div>
				</div>
			</div>
			<div className="space-y-4 pt-4">
				<h3 className="text-lg font-medium">Integrations</h3>
				<div className="divide-y rounded-lg border">
					<div className="flex items-center justify-between p-4">
						<div className="flex items-center gap-3">
							<div className="flex h-8 w-8 items-center justify-center rounded bg-black font-bold text-white">N</div>
							<div>
								<div className="font-medium">Notion</div>
								<div className="text-xs font-medium text-primary">Connected</div>
							</div>
						</div>
						<button type="button" className="text-sm text-destructive hover:underline">
							Disconnect
						</button>
					</div>
					<div className="flex items-center justify-between p-4">
						<div className="flex items-center gap-3">
							<div className="flex h-8 w-8 items-center justify-center rounded bg-primary font-bold text-primary-foreground">O</div>
							<div>
								<div className="font-medium">Obsidian</div>
								<div className="text-xs text-muted-foreground">Not connected</div>
							</div>
						</div>
						<button type="button" className="text-sm text-primary hover:underline">
							Connect
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

function BillingSettings() {
	return (
		<div className="space-y-6">
			<div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
				<h3 className="font-semibold text-primary">Current Plan: Pro</h3>
				<p className="mt-1 text-sm text-primary/80">Your next billing date is February 17, 2026.</p>
				<button type="button" className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
					Manage Subscription
				</button>
			</div>

			<div className="space-y-4">
				<h3 className="text-lg font-medium">Payment Information</h3>
				<div className="flex items-center justify-between rounded-lg border p-4">
					<div className="flex items-center gap-3">
						<div className="flex h-6 w-10 items-center justify-center rounded border bg-muted text-[10px] font-bold">VISA</div>
						<div className="text-sm">•••• •••• •••• 4242</div>
					</div>
					<button type="button" className="text-sm hover:underline">
						Edit
					</button>
				</div>
			</div>

			<div className="space-y-4">
				<h3 className="text-lg font-medium">Invoices</h3>
				<div className="divide-y rounded-lg border">
					{[
						{ date: "Jan 17, 2026", amount: "$10.00", status: "Paid" },
						{ date: "Dec 17, 2025", amount: "$10.00", status: "Paid" },
					].map((invoice, i) => (
						<div key={i} className="flex items-center justify-between p-4 text-sm">
							<div className="flex gap-4">
								<span className="text-muted-foreground">{invoice.date}</span>
								<span className="font-medium">{invoice.amount}</span>
							</div>
							<div className="flex items-center gap-4">
								<span className="font-medium text-primary">{invoice.status}</span>
								<button type="button" className="text-primary hover:underline">
									Download
								</button>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
