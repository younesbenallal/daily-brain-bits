export function FocusPromptsMockup() {
	return (
		<svg width="340" height="200" viewBox="0 0 340 200" fill="none" xmlns="http://www.w3.org/2000/svg">
			{/* Background */}
			<rect width="340" height="200" rx="8" fill="url(#promptsGradient)" />

			{/* Title */}
			<text x="24" y="36" fontSize="14" fontFamily="system-ui" fontWeight="600" fill="white">
				What are you focused on?
			</text>
			<text x="24" y="54" fontSize="11" fontFamily="system-ui" fill="white" opacity="0.8">
				We'll prioritize notes that match your goals
			</text>

			{/* Prompt Cards - Stacked effect */}
			{/* Card 3 (back) */}
			<rect x="32" y="90" width="260" height="44" rx="6" fill="white" opacity="0.6" />

			{/* Card 2 (middle) */}
			<rect x="24" y="100" width="276" height="44" rx="6" fill="white" opacity="0.85" />
			<circle cx="44" cy="122" r="10" fill="#E0F2FE" />
			<path d="M40 122L43 125L48 119" stroke="#0284C7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
			<text x="64" y="126" fontSize="12" fontFamily="system-ui" fill="#475569">
				I'm studying for my finals this month
			</text>

			{/* Card 1 (front) */}
			<rect x="16" y="112" width="292" height="44" rx="6" fill="white" filter="url(#promptShadow)" />
			<circle cx="36" cy="134" r="10" fill="#DBEAFE" />
			<path d="M32 134L35 137L40 131" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
			<text x="56" y="138" fontSize="12" fontFamily="system-ui" fill="#475569">
				I'm focused on SEO business-wise
			</text>

			{/* Add prompt hint */}
			<g transform="translate(16, 164)">
				<rect width="100" height="28" rx="14" fill="white" fillOpacity="0.2" />
				<circle cx="14" cy="14" r="6" stroke="white" strokeWidth="1.5" />
				<path d="M14 11V17M11 14H17" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
				<text x="28" y="18" fontSize="10" fontFamily="system-ui" fill="white">Add focus</text>
			</g>

			<defs>
				<linearGradient id="promptsGradient" x1="170" y1="0" x2="170" y2="200" gradientUnits="userSpaceOnUse">
					<stop stopColor="#5DA3FF" />
					<stop offset="1" stopColor="#99C5FF" />
				</linearGradient>
				<filter id="promptShadow" x="8" y="108" width="308" height="60" filterUnits="userSpaceOnUse">
					<feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.15" />
				</filter>
			</defs>
		</svg>
	);
}
