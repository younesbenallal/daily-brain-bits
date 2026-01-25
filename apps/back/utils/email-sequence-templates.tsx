import { Body, Button, Column, Container, Head, Heading, Html, Preview, Row, Section, Tailwind, Text } from "@react-email/components";
import type * as React from "react";
import { emailBodyStyle, emailTailwindConfig } from "./email-brand";

export const welcomeEmailIds = ["welcome-1", "welcome-2", "welcome-3", "welcome-4"] as const;
export const onboardingEmailIds = ["onboarding-1", "onboarding-2", "onboarding-3", "onboarding-4", "onboarding-5", "onboarding-6"] as const;
export const upgradeEmailIds = ["upgrade-1", "upgrade-2", "upgrade-3", "upgrade-4", "upgrade-5"] as const;

export type SequenceEmailId = (typeof welcomeEmailIds)[number] | (typeof onboardingEmailIds)[number] | (typeof upgradeEmailIds)[number];

export type SequenceEmailTemplateParams = {
	firstName: string;
	frontendUrl: string;
	sourceName?: string;
	digestTiming?: string;
	notesPerDigest?: number;
	totalNoteCount?: number;
	digestCount?: number;
	isPro?: boolean;
	surveyUrl?: string;
	upgradeUrl?: string;
};

type SequenceEmailDefinition = {
	subject: (params: SequenceEmailTemplateParams) => string;
	previewText: (params: SequenceEmailTemplateParams) => string;
	render: (params: SequenceEmailTemplateParams) => React.ReactElement;
	renderText: (params: SequenceEmailTemplateParams) => string;
};

const primaryButtonClass =
	"bg-brand-primary text-brand-primary-foreground rounded-full px-6 py-3.5 text-sm font-semibold font-ui no-underline border border-solid border-brand-primary block text-center shadow-[var(--email-button-shadow)]";
const secondaryButtonClass =
	"bg-brand-card text-brand-foreground rounded-full px-6 py-3.5 text-sm font-semibold font-ui no-underline border border-solid border-brand-border block text-center shadow-[var(--email-button-shadow-soft)]";

export function buildSequenceEmail(params: { emailId: SequenceEmailId; templateParams: SequenceEmailTemplateParams }) {
	const definition = sequenceEmailDefinitions[params.emailId];
	if (!definition) {
		throw new Error(`Unknown sequence email id: ${params.emailId}`);
	}
	return {
		subject: definition.subject(params.templateParams),
		previewText: definition.previewText(params.templateParams),
		react: definition.render(params.templateParams),
		text: definition.renderText(params.templateParams),
	};
}

const sequenceEmailDefinitions: Record<SequenceEmailId, SequenceEmailDefinition> = {
	"welcome-1": {
		subject: () => "Welcome to Daily Brain Bits - let's connect your notes",
		previewText: () => "Your first step: connect Notion or Obsidian",
		render: (params) => (
			<SequenceEmailShell previewText="Your first step: connect Notion or Obsidian" firstName={params.firstName}>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					Thanks for joining Daily Brain Bits. You&apos;re one step away from rediscovering your best notes.
				</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					Daily Brain Bits sends you a curated selection of your own notes - surfaced at the right time to help you remember what matters.
				</Text>
				<Text className="text-base leading-7 text-brand-foreground font-semibold m-0 mb-3">Your first step: Connect your notes</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-3">Choose where your notes live:</Text>
				<TwoButtonRow
					left={{ label: "Connect Notion", href: buildFrontendUrl(params.frontendUrl, "/onboarding/choose-source") }}
					right={{ label: "Connect Obsidian", href: buildFrontendUrl(params.frontendUrl, "/onboarding/choose-source") }}
				/>
				<Text className="text-base leading-7 text-brand-muted m-0 mt-4">
					This takes about 2 minutes. Once connected, we&apos;ll start preparing your first digest.
				</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mt-6">Talk soon,</Text>
				<Text className="text-base leading-7 text-brand-foreground m-0">The DBB Team</Text>
			</SequenceEmailShell>
		),
		renderText: (params) => `Hello ${params.firstName},

Thanks for joining Daily Brain Bits. You're one step away from rediscovering your best notes.

Daily Brain Bits sends you a curated selection of your own notes - surfaced at the right time to help you remember what matters.

Your first step: Connect your notes
Choose where your notes live:

Connect Notion: ${buildFrontendUrl(params.frontendUrl, "/onboarding/choose-source")}
Connect Obsidian: ${buildFrontendUrl(params.frontendUrl, "/onboarding/choose-source")}

This takes about 2 minutes. Once connected, we'll start preparing your first digest.

Talk soon,
The DBB Team
`,
	},
	"welcome-2": {
		subject: () => "Quick question - Notion or Obsidian?",
		previewText: () => "Connect in under 2 minutes",
		render: (params) => (
			<SequenceEmailShell previewText="Connect in under 2 minutes" firstName={params.firstName}>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">A quick follow-up: where do you keep your notes?</Text>
				<Text className="text-base leading-7 text-brand-foreground font-semibold m-0 mb-1">Notion</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-3">Connect via OAuth. We sync your databases and pages automatically.</Text>
				<Text className="text-base leading-7 text-brand-foreground font-semibold m-0 mb-1">Obsidian</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">Install our plugin. Your notes stay local, synced on your terms.</Text>
				<TwoButtonRow
					left={{ label: "Connect Notion", href: buildFrontendUrl(params.frontendUrl, "/onboarding/choose-source") }}
					right={{ label: "Connect Obsidian", href: buildFrontendUrl(params.frontendUrl, "/onboarding/choose-source") }}
				/>
				<Text className="text-base leading-7 text-brand-muted m-0 mt-4">
					Once connected, you&apos;ll receive your first digest within 24 hours. No more forgotten notes.
				</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mt-6">- The DBB Team</Text>
			</SequenceEmailShell>
		),
		renderText: (params) => `Hello ${params.firstName},

A quick follow-up: where do you keep your notes?

Notion - Connect via OAuth. We sync your databases and pages automatically.
Obsidian - Install our plugin. Your notes stay local, synced on your terms.

Connect Notion: ${buildFrontendUrl(params.frontendUrl, "/onboarding/choose-source")}
Connect Obsidian: ${buildFrontendUrl(params.frontendUrl, "/onboarding/choose-source")}

Once connected, you'll receive your first digest within 24 hours. No more forgotten notes.

- The DBB Team
`,
	},
	"welcome-3": {
		subject: () => "Your notes stay yours",
		previewText: () => "How we handle your data",
		render: (params) => (
			<SequenceEmailShell previewText="How we handle your data" firstName={params.firstName}>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					We noticed you haven&apos;t connected your notes yet. Totally understandable - here&apos;s how we handle your data:
				</Text>
				<Text className="text-base leading-7 text-brand-foreground font-semibold m-0 mb-2">For Notion:</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-1">- We only access databases/pages you explicitly select</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-1">- OAuth connection can be revoked anytime</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">- We never modify your Notion content</Text>
				<Text className="text-base leading-7 text-brand-foreground font-semibold m-0 mb-2">For Obsidian:</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-1">- Notes never leave your device unless you sync them</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-1">- The plugin is open source - inspect it yourself</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">- You control exactly what gets included</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					We built DBB because we wanted this for ourselves. Privacy isn&apos;t a feature; it&apos;s the foundation.
				</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">Ready to give it a try?</Text>
				<SingleButton label="Connect your notes" href={buildFrontendUrl(params.frontendUrl, "/onboarding/choose-source")} />
				<Text className="text-base leading-7 text-brand-muted m-0 mt-6">- The DBB Team</Text>
			</SequenceEmailShell>
		),
		renderText: (params) => `Hello ${params.firstName},

We noticed you haven't connected your notes yet. Totally understandable - here's how we handle your data:

For Notion:
- We only access databases/pages you explicitly select
- OAuth connection can be revoked anytime
- We never modify your Notion content

For Obsidian:
- Notes never leave your device unless you sync them
- The plugin is open source - inspect it yourself
- You control exactly what gets included

We built DBB because we wanted this for ourselves. Privacy isn't a feature; it's the foundation.

Ready to give it a try?

Connect your notes: ${buildFrontendUrl(params.frontendUrl, "/onboarding/choose-source")}

- The DBB Team
`,
	},
	"welcome-4": {
		subject: (params) => `Your notes are waiting, ${params.firstName}`,
		previewText: () => "One connection, then the magic starts",
		render: (params) => (
			<SequenceEmailShell previewText="One connection, then the magic starts" firstName={params.firstName}>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					This is my last nudge (promise). You signed up for Daily Brain Bits but haven&apos;t connected your notes yet.
				</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-3">Here&apos;s what you&apos;re missing:</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-1">- Rediscover notes you forgot you wrote</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-1">- Surface ideas at the perfect time to remember them</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">- Build a sustainable review habit without the effort</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">All it takes is one connection - about 2 minutes.</Text>
				<TwoButtonRow
					left={{ label: "Connect Notion", href: buildFrontendUrl(params.frontendUrl, "/onboarding/choose-source") }}
					right={{ label: "Connect Obsidian", href: buildFrontendUrl(params.frontendUrl, "/onboarding/choose-source") }}
				/>
				<Text className="text-base leading-7 text-brand-muted m-0 mt-4">
					If DBB isn&apos;t right for you, no hard feelings. You can manage email preferences in settings.
				</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mt-6">- The DBB Team</Text>
			</SequenceEmailShell>
		),
		renderText: (params) => `Hello ${params.firstName},

This is my last nudge (promise). You signed up for Daily Brain Bits but haven't connected your notes yet.

Here's what you're missing:
- Rediscover notes you forgot you wrote
- Surface ideas at the perfect time to remember them
- Build a sustainable review habit without the effort

All it takes is one connection - about 2 minutes.

Connect Notion: ${buildFrontendUrl(params.frontendUrl, "/onboarding/choose-source")}
Connect Obsidian: ${buildFrontendUrl(params.frontendUrl, "/onboarding/choose-source")}

If DBB isn't right for you, no hard feelings. You can manage email preferences in settings.

- The DBB Team
`,
	},
	"onboarding-1": {
		subject: (params) => `Your ${params.sourceName ?? "notes"} are syncing`,
		previewText: () => "First digest coming soon",
		render: (params) => (
			<SequenceEmailShell previewText="First digest coming soon" firstName={params.firstName}>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					Great news - your {params.sourceName ?? "notes source"} is now connected to Daily Brain Bits.
				</Text>
				<Text className="text-base leading-7 text-brand-foreground font-semibold m-0 mb-3">What happens next:</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-1">1. We&apos;re syncing your notes (this may take a few minutes)</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-1">2. Our algorithm will select your first batch of notes</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					3. You&apos;ll receive your first digest {params.digestTiming ?? "soon"}
				</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">While you wait, you can configure your preferences:</Text>
				<SingleButton label="Set your digest preferences" href={buildFrontendUrl(params.frontendUrl, "/onboarding/preferences")} />
				<Text className="text-base leading-7 text-brand-muted m-0 mt-6">Your notes are in good hands.</Text>
				<Text className="text-base leading-7 text-brand-muted m-0">- The DBB Team</Text>
			</SequenceEmailShell>
		),
		renderText: (params) => `Hello ${params.firstName},

Great news - your ${params.sourceName ?? "notes source"} is now connected to Daily Brain Bits.

What happens next:
1. We're syncing your notes (this may take a few minutes)
2. Our algorithm will select your first batch of notes
3. You'll receive your first digest ${params.digestTiming ?? "soon"}

While you wait, you can configure your preferences:
${buildFrontendUrl(params.frontendUrl, "/onboarding/preferences")}

Your notes are in good hands.

- The DBB Team
`,
	},
	"onboarding-2": {
		subject: () => "Your first Brain Bits digest is almost ready",
		previewText: () => "Here's what to expect",
		render: (params) => (
			<SequenceEmailShell previewText="Here's what to expect" firstName={params.firstName}>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					Your first Daily Brain Bits digest is being prepared. Here&apos;s what to expect:
				</Text>
				<Text className="text-base leading-7 text-brand-foreground font-semibold m-0 mb-2">What you&apos;ll receive:</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-1">
					- {params.notesPerDigest ?? 5} notes selected from your {params.sourceName ?? "source"}
				</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-1">- Chosen based on relevance, age, and review history</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">- Formatted for quick reading and recall</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					Pro tip: When you receive your digest, don&apos;t just skim it. Take 2 minutes to actually read the notes. That&apos;s how the magic happens
					- rediscovering your own ideas.
				</Text>
				<Text className="text-base leading-7 text-brand-muted m-0">Your first digest will arrive {params.digestTiming ?? "soon"}.</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mt-6">- The DBB Team</Text>
			</SequenceEmailShell>
		),
		renderText: (params) => `Hello ${params.firstName},

Your first Daily Brain Bits digest is being prepared. Here's what to expect:

What you'll receive:
- ${params.notesPerDigest ?? 5} notes selected from your ${params.sourceName ?? "source"}
- Chosen based on relevance, age, and review history
- Formatted for quick reading and recall

Pro tip: When you receive your digest, don't just skim it. Take 2 minutes to actually read the notes. That's how the magic happens - rediscovering your own ideas.

Your first digest will arrive ${params.digestTiming ?? "soon"}.

- The DBB Team
`,
	},
	"onboarding-3": {
		subject: () => "Did you spot a forgotten gem?",
		previewText: () => "Your first digest just landed",
		render: (params) => (
			<SequenceEmailShell previewText="Your first digest just landed" firstName={params.firstName}>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					Your first Daily Brain Bits digest just landed. Did you rediscover anything interesting?
				</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					That &quot;oh, I forgot about this!&quot; moment - that&apos;s why we built DBB. Your notes deserve to be remembered, not buried.
				</Text>
				<Text className="text-base leading-7 text-brand-foreground font-semibold m-0 mb-2">Here&apos;s how to get more value:</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-1">- Star notes you want to see more often</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-1">- Skip notes that aren&apos;t worth revisiting</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">- These signals help us surface better content over time</Text>
				<SingleButton label="View your digest" href={buildFrontendUrl(params.frontendUrl, "/dash")} />
				<Text className="text-base leading-7 text-brand-muted m-0 mt-4">We&apos;d love to hear what you think. Just reply to this email.</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mt-6">- The DBB Team</Text>
			</SequenceEmailShell>
		),
		renderText: (params) => `Hello ${params.firstName},

Your first Daily Brain Bits digest just landed. Did you rediscover anything interesting?

That "oh, I forgot about this!" moment - that's why we built DBB. Your notes deserve to be remembered, not buried.

Here's how to get more value:
- Star notes you want to see more often
- Skip notes that aren't worth revisiting
- These signals help us surface better content over time

View your digest: ${buildFrontendUrl(params.frontendUrl, "/dash")}

We'd love to hear what you think. Just reply to this email.

- The DBB Team
`,
	},
	"onboarding-4": {
		subject: () => "Quick settings to improve your digests",
		previewText: () => "2 minutes to better Brain Bits",
		render: (params) => (
			<SequenceEmailShell previewText="2 minutes to better Brain Bits" firstName={params.firstName}>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					You&apos;ve received a few digests now. Here are some ways to make DBB work better for you:
				</Text>
				<Text className="text-base leading-7 text-brand-foreground font-semibold m-0 mb-2">1. Adjust your timing</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-3">
					Receive digests when you actually have time to read them. Morning commute? Lunch break? Evening wind-down?
				</Text>
				<Text className="text-base leading-7 text-brand-foreground font-semibold m-0 mb-2">2. Set your frequency</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-3">
					{params.isPro
						? "Daily, weekly, or monthly - whatever fits your rhythm."
						: "Free plan includes weekly or monthly digests. Upgrade to Pro for daily."}
				</Text>
				<Text className="text-base leading-7 text-brand-foreground font-semibold m-0 mb-2">3. Add another source</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					{params.isPro
						? "Connect both Notion and Obsidian to get the full picture."
						: "Pro users can connect multiple sources. Worth it if you use both."}
				</Text>
				<SingleButton label="Open settings" href={buildFrontendUrl(params.frontendUrl, "/settings")} />
				<Text className="text-base leading-7 text-brand-muted m-0 mt-6">- The DBB Team</Text>
			</SequenceEmailShell>
		),
		renderText: (params) => `Hello ${params.firstName},

You've received a few digests now. Here are some ways to make DBB work better for you:

1. Adjust your timing
Receive digests when you actually have time to read them. Morning commute? Lunch break? Evening wind-down?

2. Set your frequency
${params.isPro ? "Daily, weekly, or monthly - whatever fits your rhythm." : "Free plan includes weekly or monthly digests. Upgrade to Pro for daily."}

3. Add another source
${params.isPro ? "Connect both Notion and Obsidian to get the full picture." : "Pro users can connect multiple sources. Worth it if you use both."}

Open settings: ${buildFrontendUrl(params.frontendUrl, "/settings")}

- The DBB Team
`,
	},
	"onboarding-5": {
		subject: () => "847 notes rediscovered this week",
		previewText: () => "Join the DBB community",
		render: (params) => (
			<SequenceEmailShell previewText="Join the DBB community" firstName={params.firstName}>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					Here&apos;s a quick stat: DBB users rediscovered over 847 notes last week. That&apos;s 847 ideas that would have stayed buried.
				</Text>
				<Text className="text-base leading-7 text-brand-foreground font-semibold m-0 mb-2">What people are saying:</Text>
				<Text className="text-sm leading-6 text-brand-muted m-0 mb-3 italic border-l-2 border-solid border-brand-border pl-3">
					&quot;I found a note from 2 years ago that perfectly solved a problem I&apos;m facing now.&quot; - Sarah, product designer
				</Text>
				<Text className="text-sm leading-6 text-brand-muted m-0 mb-4 italic border-l-2 border-solid border-brand-border pl-3">
					&quot;It&apos;s like having a personal assistant that knows exactly what I need to remember.&quot; - James, researcher
				</Text>
				<Text className="text-base leading-7 text-brand-muted m-0">
					You&apos;re part of a community of people who value their ideas enough to revisit them.
				</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mt-4">Keep reading those digests.</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mt-6">- The DBB Team</Text>
			</SequenceEmailShell>
		),
		renderText: (params) => `Hello ${params.firstName},

Here's a quick stat: DBB users rediscovered over 847 notes last week. That's 847 ideas that would have stayed buried.

What people are saying:
"I found a note from 2 years ago that perfectly solved a problem I'm facing now." - Sarah, product designer
"It's like having a personal assistant that knows exactly what I need to remember." - James, researcher

You're part of a community of people who value their ideas enough to revisit them.
Keep reading those digests.

- The DBB Team
`,
	},
	"onboarding-6": {
		subject: () => "Two weeks in - how's DBB working for you?",
		previewText: () => "Quick check-in",
		render: (params) => (
			<SequenceEmailShell previewText="Quick check-in" firstName={params.firstName}>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					You&apos;ve been using Daily Brain Bits for two weeks now. How&apos;s it going?
				</Text>
				<Text className="text-base leading-7 text-brand-foreground font-semibold m-0 mb-2">Quick survey (pick one):</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-1">- It&apos;s great - I&apos;m rediscovering useful notes</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-1">- It&apos;s okay - could be better</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">- Not working for me</Text>
				<SingleButton label="Take 10-second survey" href={params.surveyUrl ?? buildFrontendUrl(params.frontendUrl, "/feedback")} />
				<Text className="text-base leading-7 text-brand-muted m-0 mt-4">
					Your feedback helps us improve. And if something&apos;s not working, we want to fix it.
				</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mt-6">
					P.S. If you have specific feedback, just reply to this email. We read everything.
				</Text>
			</SequenceEmailShell>
		),
		renderText: (params) => `Hello ${params.firstName},

You've been using Daily Brain Bits for two weeks now. How's it going?

Quick survey (pick one):
- It's great - I'm rediscovering useful notes
- It's okay - could be better
- Not working for me

Take 10-second survey: ${params.surveyUrl ?? buildFrontendUrl(params.frontendUrl, "/feedback")}

Your feedback helps us improve. And if something's not working, we want to fix it.

P.S. If you have specific feedback, just reply to this email. We read everything.
`,
	},
	"upgrade-1": {
		subject: (params) => `You've rediscovered ${params.totalNoteCount ?? 0} notes so far`,
		previewText: () => "Here's what Pro could add",
		render: (params) => (
			<SequenceEmailShell previewText="Here's what Pro could add" firstName={params.firstName}>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					Quick stat: you&apos;ve received {params.digestCount ?? 0} digests containing {params.totalNoteCount ?? 0} notes since joining DBB.
					That&apos;s {params.totalNoteCount ?? 0} ideas that didn&apos;t stay buried.
				</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					You&apos;re clearly finding value here. I wanted to let you know about Pro - not to pressure you, but because you might want more.
				</Text>
				<Text className="text-base leading-7 text-brand-foreground font-semibold m-0 mb-2">What Pro adds:</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-1">- Daily digests - more frequent surfacing means better retention</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-1">- AI quizzes - test yourself on your notes to truly remember them</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">- Multiple sources - connect both Notion and Obsidian</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">If weekly digests are working for you, stick with Free. No pressure.</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">But if you want more, Pro is $10/month.</Text>
				<SingleButton label="See Pro features" href={params.upgradeUrl ?? buildFrontendUrl(params.frontendUrl, "/settings?tab=billing")} />
				<Text className="text-base leading-7 text-brand-muted m-0 mt-6">- The DBB Team</Text>
			</SequenceEmailShell>
		),
		renderText: (params) => `Hello ${params.firstName},

Quick stat: you've received ${params.digestCount ?? 0} digests containing ${params.totalNoteCount ?? 0} notes since joining DBB. That's ${params.totalNoteCount ?? 0} ideas that didn't stay buried.

You're clearly finding value here. I wanted to let you know about Pro - not to pressure you, but because you might want more.

What Pro adds:
- Daily digests - more frequent surfacing means better retention
- AI quizzes - test yourself on your notes to truly remember them
- Multiple sources - connect both Notion and Obsidian

If weekly digests are working for you, stick with Free. No pressure.

But if you want more, Pro is $10/month.

See Pro features: ${params.upgradeUrl ?? buildFrontendUrl(params.frontendUrl, "/settings?tab=billing")}

- The DBB Team
`,
	},
	"upgrade-2": {
		subject: () => "What $10/month gets you",
		previewText: () => "Honest comparison",
		render: (params) => (
			<SequenceEmailShell previewText="Honest comparison" firstName={params.firstName}>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">Here&apos;s an honest breakdown of Free vs Pro:</Text>
				<ComparisonRow label="Digest frequency" left="Weekly or monthly" right="Daily, weekly, or monthly" />
				<ComparisonRow label="Sources" left="1" right="Unlimited" />
				<ComparisonRow label="AI quizzes" left="No" right="Yes" />
				<ComparisonRow label="Note selection" left="Same algorithm" right="Same algorithm" />
				<ComparisonRow label="Support" left="Community" right="Priority" />
				<Text className="text-base leading-7 text-brand-muted m-0 mt-4">The real question: How often do you want to revisit your notes?</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mt-3">- If weekly is enough &rarr; Free works great</Text>
				<Text className="text-base leading-7 text-brand-muted m-0">- If you want daily reinforcement &rarr; Pro is worth it</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">- If you use both Notion and Obsidian &rarr; Pro is the only way</Text>
				<SingleButton label="Upgrade to Pro" href={params.upgradeUrl ?? buildFrontendUrl(params.frontendUrl, "/settings?tab=billing")} />
				<Text className="text-base leading-7 text-brand-muted m-0 mt-6">- The DBB Team</Text>
			</SequenceEmailShell>
		),
		renderText: (params) => `Hello ${params.firstName},

Here's an honest breakdown of Free vs Pro:

Digest frequency: Free = Weekly or monthly, Pro = Daily, weekly, or monthly
Sources: Free = 1, Pro = Unlimited
AI quizzes: Free = No, Pro = Yes
Note selection: Free = Same algorithm, Pro = Same algorithm
Support: Free = Community, Pro = Priority

The real question: How often do you want to revisit your notes?
- If weekly is enough -> Free works great
- If you want daily reinforcement -> Pro is worth it
- If you use both Notion and Obsidian -> Pro is the only way

Upgrade to Pro: ${params.upgradeUrl ?? buildFrontendUrl(params.frontendUrl, "/settings?tab=billing")}

- The DBB Team
`,
	},
	"upgrade-3": {
		subject: () => '"I finally remember what I read"',
		previewText: () => "A Pro user's story",
		render: (params) => (
			<SequenceEmailShell previewText="A Pro user's story" firstName={params.firstName}>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">I wanted to share how one Pro user, Maya, uses Daily Brain Bits:</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					Maya is a UX researcher. She takes hundreds of notes from user interviews, books, and articles. Her problem: she&apos;d take a note, then
					never see it again.
				</Text>
				<Text className="text-base leading-7 text-brand-foreground font-semibold m-0 mb-2">Her setup:</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-1">- Obsidian vault with 2,000+ notes</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-1">- Daily digest at 8am (train commute)</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">- AI quizzes enabled for key concepts</Text>
				<Text className="text-base leading-7 text-brand-foreground font-semibold m-0 mb-2">What changed:</Text>
				<Text className="text-sm leading-6 text-brand-muted m-0 mb-4 italic border-l-2 border-solid border-brand-border pl-3">
					&quot;I used to feel guilty about all the notes I&apos;d forgotten. Now I trust that the important ones will resurface. Last week, a note
					from 18 months ago directly influenced a design decision.&quot;
				</Text>
				<Text className="text-base leading-7 text-brand-foreground font-semibold m-0 mb-2">The insight:</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					Daily repetition isn&apos;t about quantity. It&apos;s about trusting the system so you can stop worrying.
				</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					Maya pays $10/month. She says it&apos;s the best ROI of any subscription she has.
				</Text>
				<SingleButton label="Try Pro for yourself" href={params.upgradeUrl ?? buildFrontendUrl(params.frontendUrl, "/settings?tab=billing")} />
				<Text className="text-base leading-7 text-brand-muted m-0 mt-6">- The DBB Team</Text>
			</SequenceEmailShell>
		),
		renderText: (params) => `Hello ${params.firstName},

I wanted to share how one Pro user, Maya, uses Daily Brain Bits:

Maya is a UX researcher. She takes hundreds of notes from user interviews, books, and articles. Her problem: she'd take a note, then never see it again.

Her setup:
- Obsidian vault with 2,000+ notes
- Daily digest at 8am (train commute)
- AI quizzes enabled for key concepts

What changed:
"I used to feel guilty about all the notes I'd forgotten. Now I trust that the important ones will resurface. Last week, a note from 18 months ago directly influenced a design decision."

The insight:
Daily repetition isn't about quantity. It's about trusting the system so you can stop worrying.

Maya pays $10/month. She says it's the best ROI of any subscription she has.

Try Pro for yourself: ${params.upgradeUrl ?? buildFrontendUrl(params.frontendUrl, "/settings?tab=billing")}

- The DBB Team
`,
	},
	"upgrade-4": {
		subject: () => "The #1 reason people don't upgrade (and why it's wrong)",
		previewText: () => "You might be overthinking this",
		render: (params) => (
			<SequenceEmailShell previewText="You might be overthinking this" firstName={params.firstName}>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					The most common reason people don&apos;t upgrade to Pro: &quot;I don&apos;t have time to read daily emails.&quot;
				</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">I get it. More emails = more overwhelm. But here&apos;s the thing:</Text>
				<Text className="text-base leading-7 text-brand-foreground font-semibold m-0 mb-2">Daily digests take 2-3 minutes.</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">Same as weekly ones - just more frequent.</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-3">
					The question isn&apos;t &quot;do I have time?&quot; It&apos;s &quot;do I have 2 minutes at a consistent time?&quot;
				</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-1">- Morning coffee? That works.</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-1">- Lunch break? Perfect.</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">- Evening wind-down? Great.</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					Pro tip: Set your preferred send time in settings. Get the digest when you actually have a moment.
				</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					And if daily feels like too much? You can always switch back to weekly. Pro gives you the choice.
				</Text>
				<SingleButton label="Upgrade to Pro" href={params.upgradeUrl ?? buildFrontendUrl(params.frontendUrl, "/settings?tab=billing")} />
				<Text className="text-base leading-7 text-brand-muted m-0 mt-6">- The DBB Team</Text>
			</SequenceEmailShell>
		),
		renderText: (params) => `Hello ${params.firstName},

The most common reason people don't upgrade to Pro: "I don't have time to read daily emails."

I get it. More emails = more overwhelm. But here's the thing:

Daily digests take 2-3 minutes. Same as weekly ones - just more frequent.

The question isn't "do I have time?" It's "do I have 2 minutes at a consistent time?"
- Morning coffee? That works.
- Lunch break? Perfect.
- Evening wind-down? Great.

Pro tip: Set your preferred send time in settings. Get the digest when you actually have a moment.

And if daily feels like too much? You can always switch back to weekly. Pro gives you the choice.

Upgrade to Pro: ${params.upgradeUrl ?? buildFrontendUrl(params.frontendUrl, "/settings?tab=billing")}

- The DBB Team
`,
	},
	"upgrade-5": {
		subject: () => "This is my last email about Pro",
		previewText: () => "No more upgrade emails after this",
		render: (params) => (
			<SequenceEmailShell previewText="No more upgrade emails after this" firstName={params.firstName}>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					This is my last email about upgrading to Pro. After this, I&apos;ll stop asking.
				</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-3">Here&apos;s the summary:</Text>
				<Text className="text-base leading-7 text-brand-foreground font-semibold m-0 mb-2">Pro ($10/month) gets you:</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-1">- Daily digests (vs weekly/monthly)</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-1">- AI quizzes to test retention</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">- Connect multiple sources</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">
					If that&apos;s not for you, totally fine. Free is designed to be useful on its own. You&apos;ll keep getting your weekly digests.
				</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mb-4">If you want to try Pro, now&apos;s the time:</Text>
				<SingleButton label="Upgrade to Pro - $10/month" href={params.upgradeUrl ?? buildFrontendUrl(params.frontendUrl, "/settings?tab=billing")} />
				<Text className="text-base leading-7 text-brand-muted m-0 mt-4">
					Either way, thanks for using Daily Brain Bits. Your notes deserve to be remembered.
				</Text>
				<Text className="text-base leading-7 text-brand-muted m-0 mt-6">- The DBB Team</Text>
			</SequenceEmailShell>
		),
		renderText: (params) => `Hello ${params.firstName},

This is my last email about upgrading to Pro. After this, I'll stop asking.

Here's the summary:
Pro ($10/month) gets you:
- Daily digests (vs weekly/monthly)
- AI quizzes to test retention
- Connect multiple sources

If that's not for you, totally fine. Free is designed to be useful on its own. You'll keep getting your weekly digests.

If you want to try Pro, now's the time:
Upgrade to Pro - $10/month: ${params.upgradeUrl ?? buildFrontendUrl(params.frontendUrl, "/settings?tab=billing")}

Either way, thanks for using Daily Brain Bits. Your notes deserve to be remembered.

- The DBB Team
`,
	},
};

function SequenceEmailShell(props: { previewText: string; firstName: string; children: React.ReactNode }) {
	return (
		<Html lang="en">
			<Tailwind config={emailTailwindConfig}>
				<Head />
				<Body className="font-body m-0 text-brand-foreground" style={emailBodyStyle}>
					<Preview>{props.previewText}</Preview>
					<Section className="py-10">
						<Container className="max-w-[600px] mx-auto px-5">
							<Heading className="text-[30px] leading-[1.15] font-semibold font-display text-brand-foreground m-0 mb-4">
								Hello {props.firstName},
							</Heading>
							{props.children}
							<Section className="mt-8">
								<Text className="text-xs text-brand-muted font-ui m-0">Daily Brain Bits · Sent to help you retain what matters.</Text>
							</Section>
						</Container>
					</Section>
				</Body>
			</Tailwind>
		</Html>
	);
}

function SingleButton(props: { label: string; href: string; variant?: "primary" | "secondary" }) {
	const className = props.variant === "secondary" ? secondaryButtonClass : primaryButtonClass;
	return (
		<Section className="mb-2">
			<Button href={props.href} className={className}>
				{props.label}
			</Button>
		</Section>
	);
}

function TwoButtonRow(props: { left: { label: string; href: string }; right: { label: string; href: string } }) {
	return (
		<Section className="mb-2">
			<Row>
				<Column className="pr-2">
					<Button href={props.left.href} className={primaryButtonClass}>
						{props.left.label}
					</Button>
				</Column>
				<Column className="pl-2">
					<Button href={props.right.href} className={secondaryButtonClass}>
						{props.right.label}
					</Button>
				</Column>
			</Row>
		</Section>
	);
}

function ComparisonRow(props: { label: string; left: string; right: string }) {
	return (
		<Section className="border border-solid border-brand-border rounded-2xl px-5 py-4 mb-4" style={{ boxShadow: "var(--email-card-shadow)" }}>
			<Text className="text-sm font-semibold font-ui text-brand-foreground m-0 mb-1">{props.label}</Text>
			<Text className="text-sm leading-6 text-brand-muted m-0">
				Free: {props.left} - Pro: {props.right}
			</Text>
		</Section>
	);
}

function buildFrontendUrl(frontendUrl: string, path: string) {
	const base = frontendUrl.replace(/\/$/, "");
	if (!path.startsWith("/")) {
		return `${base}/${path}`;
	}
	return `${base}${path}`;
}
