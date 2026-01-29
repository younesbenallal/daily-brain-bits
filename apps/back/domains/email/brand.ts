import { pixelBasedPreset, type TailwindConfig } from "@react-email/components";
import type { CSSProperties } from "react";

const brandColorValues = {
	primary: "#63a1f2",
	"primary-foreground": "#f7f9fc",
	background: "#f5f9ff",
	foreground: "#252a37",
	muted: "#656e81",
	// Darker muted for text on blue gradient backgrounds
	"muted-on-blue": "#1e3a5f",
	card: "#ffffff",
	border: "#e8eaed",
	"sky-top": "#5ca5ff",
	"sky-bottom": "#99c5ff",
	"card-shadow": "0 20px 50px rgba(15, 23, 42, 0.12)",
	"button-shadow": "0 12px 24px rgba(37, 86, 160, 0.25)",
	"button-shadow-soft": "0 8px 18px rgba(37, 86, 160, 0.15)",
	"code-bg": "rgba(99, 161, 242, 0.08)",
} as const;

// Use hardcoded values for Tailwind - Gmail strips CSS variables
const brandColors = {
	primary: brandColorValues.primary,
	"primary-foreground": brandColorValues["primary-foreground"],
	background: brandColorValues.background,
	foreground: brandColorValues.foreground,
	muted: brandColorValues.muted,
	"muted-on-blue": brandColorValues["muted-on-blue"],
	card: brandColorValues.card,
	border: brandColorValues.border,
} as const;

// Georgia is a better fallback for Crimson Pro than Times New Roman
const brandFonts = {
	display: ["Crimson Pro", "Georgia", "Times New Roman", "serif"],
	body: ["DM Sans", "Helvetica Neue", "Arial", "sans-serif"],
	ui: ["Mona Sans", "DM Sans", "Helvetica Neue", "Arial", "sans-serif"],
} as const;

// Google Fonts URL for email - Crimson Pro for display headings
export const emailGoogleFontsUrl = "https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&display=swap";

export const emailTailwindConfig = {
	presets: [pixelBasedPreset],
	theme: {
		extend: {
			colors: {
				brand: brandColors,
			},
			fontFamily: brandFonts,
		},
	},
} satisfies TailwindConfig;

export const emailBrand = {
	colors: brandColors,
	fonts: brandFonts,
} as const;

export const emailCssVars = {
	"--email-primary": brandColorValues.primary,
	"--email-primary-foreground": brandColorValues["primary-foreground"],
	"--email-background": brandColorValues.background,
	"--email-foreground": brandColorValues.foreground,
	"--email-muted": brandColorValues.muted,
	"--email-card": brandColorValues.card,
	"--email-border": brandColorValues.border,
	"--email-sky-top": brandColorValues["sky-top"],
	"--email-sky-bottom": brandColorValues["sky-bottom"],
	"--email-gradient": `linear-gradient(180deg, ${brandColorValues["sky-top"]} 0%, ${brandColorValues["sky-bottom"]} 100%)`,
	"--email-card-shadow": brandColorValues["card-shadow"],
	"--email-button-shadow": brandColorValues["button-shadow"],
	"--email-button-shadow-soft": brandColorValues["button-shadow-soft"],
	"--email-code-bg": brandColorValues["code-bg"],
} as CSSProperties;

export const emailBodyStyle = {
	...emailCssVars,
	// Gmail strips CSS variables, so we must use hardcoded values for background
	backgroundColor: brandColorValues.background,
} as CSSProperties;

// Gmail strips background-image gradients on body/html, so we need a wrapper element
export const emailGradientWrapperStyle = {
	background: `linear-gradient(180deg, ${brandColorValues["sky-top"]} 0%, ${brandColorValues["sky-bottom"]} 100%)`,
	backgroundColor: brandColorValues["sky-top"], // Fallback for clients that strip gradients
} as CSSProperties;
