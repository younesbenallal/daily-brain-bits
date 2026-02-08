export function FocusPromptsMockup() {
	return (
		<svg width="340" height="220" viewBox="0 0 340 220" fill="none" xmlns="http://www.w3.org/2000/svg">
			{/* Background */}
			<rect width="340" height="220" rx="8" fill="url(#promptsGradient)" />

			{/* Title */}
			<text x="24" y="32" fontSize="14" fontFamily="system-ui" fontWeight="600" fill="white">
				What are you focused on?
			</text>
			<text x="24" y="50" fontSize="11" fontFamily="system-ui" fill="white" opacity="0.8">
				We'll prioritize notes that match your goals
			</text>

			{/* Prompt Cards - Stacked effect with clear separation */}
			{/* Card 3 (back) - visible top portion */}
			<rect x="40" y="72" width="260" height="40" rx="6" fill="white" opacity="0.5" />
			<circle cx="58" cy="92" r="8" fill="#E0F2FE" opacity="0.7" />
			<rect x="76" y="88" width="140" height="8" rx="4" fill="#E2E8F0" />

			{/* Card 2 (middle) - partially visible */}
			<rect x="28" y="88" width="268" height="44" rx="6" fill="white" opacity="0.75" />
			<circle cx="48" cy="110" r="9" fill="#E0F2FE" />
			<path d="M44 110L47 113L52 107" stroke="#0284C7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
			<text x="66" y="114" fontSize="11" fontFamily="system-ui" fill="#64748B">
				Studying for my finals this month
			</text>

			{/* Card 1 (front) - fully visible */}
			<rect x="16" y="108" width="284" height="48" rx="6" fill="white" filter="url(#promptShadow)" />
			<circle cx="38" cy="132" r="10" fill="#DBEAFE" />
			<path d="M34 132L37 135L42 129" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
			<text x="58" y="136" fontSize="12" fontFamily="system-ui" fill="#334155">
				I'm focused on SEO business-wise
			</text>

			{/* Add prompt hint */}
			<g transform="translate(16, 168)">
				<rect width="100" height="28" rx="14" fill="white" fillOpacity="0.2" />
				<circle cx="14" cy="14" r="6" stroke="white" strokeWidth="1.5" fill="none" />
				<path d="M14 11V17M11 14H17" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
				<text x="28" y="18" fontSize="10" fontFamily="system-ui" fill="white">Add focus</text>
			</g>

			<defs>
				<linearGradient id="promptsGradient" x1="170" y1="0" x2="170" y2="220" gradientUnits="userSpaceOnUse">
					<stop stopColor="#5DA3FF" />
					<stop offset="1" stopColor="#99C5FF" />
				</linearGradient>
				<filter id="promptShadow" x="8" y="104" width="300" height="64" filterUnits="userSpaceOnUse">
					<feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.15" />
				</filter>
			</defs>
		</svg>
	);
}
