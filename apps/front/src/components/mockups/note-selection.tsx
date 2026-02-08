export function NoteSelectionMockup() {
	return (
		<svg width="340" height="240" viewBox="0 0 340 240" fill="none" xmlns="http://www.w3.org/2000/svg">
			{/* Background */}
			<rect width="340" height="240" rx="12" fill="url(#selectionGradient)" />

			{/* Title */}
			<text x="24" y="32" fontSize="14" fontFamily="system-ui" fontWeight="600" fill="white">
				Smart Note Selection
			</text>
			<text x="24" y="50" fontSize="10" fontFamily="system-ui" fill="white" opacity="0.8">
				AI picks the perfect notes for your digest
			</text>

			{/* Stack of note cards */}
			{/* Card 5 (back) */}
			<rect x="60" y="90" width="180" height="100" rx="8" fill="white" opacity="0.3" transform="rotate(-6 150 140)" />

			{/* Card 4 */}
			<rect x="55" y="85" width="180" height="100" rx="8" fill="white" opacity="0.4" transform="rotate(-3 145 135)" />

			{/* Card 3 */}
			<rect x="50" y="80" width="180" height="100" rx="8" fill="white" opacity="0.6" />
			<rect x="62" y="92" width="80" height="8" rx="2" fill="#E5E5E5" />
			<rect x="62" y="106" width="140" height="6" rx="2" fill="#F0F0F0" />
			<rect x="62" y="118" width="120" height="6" rx="2" fill="#F0F0F0" />

			{/* Card 2 */}
			<rect x="90" y="75" width="180" height="100" rx="8" fill="white" opacity="0.85" />
			<rect x="102" y="87" width="90" height="8" rx="2" fill="#E5E5E5" />
			<rect x="102" y="101" width="150" height="6" rx="2" fill="#F0F0F0" />
			<rect x="102" y="113" width="130" height="6" rx="2" fill="#F0F0F0" />

			{/* Card 1 (selected - elevated) */}
			<g filter="url(#selectedShadow)">
				<rect x="130" y="65" width="180" height="110" rx="8" fill="white" />
				<rect x="130" y="65" width="180" height="110" rx="8" stroke="#5DA3FF" strokeWidth="2" />

				{/* Star badge */}
				<circle cx="295" cy="80" r="12" fill="#FEF3C7" />
				<path d="M295 72L297 78H303L298 82L300 88L295 84L290 88L292 82L287 78H293L295 72Z" fill="#F59E0B" />

				{/* Card content */}
				<text x="146" y="88" fontSize="12" fontFamily="Georgia, serif" fontWeight="600" fill="#5DA3FF">
					The Art of Deep Work
				</text>
				<text x="146" y="106" fontSize="9" fontFamily="system-ui" fill="#6B7280">
					<tspan x="146" dy="0">Focus without distraction on</tspan>
					<tspan x="146" dy="12">cognitively demanding tasks...</tspan>
				</text>

				{/* Tags */}
				<rect x="146" y="140" width="50" height="18" rx="9" fill="#EEF6FF" />
				<text x="158" y="152" fontSize="8" fontFamily="system-ui" fill="#5DA3FF">#focus</text>
				<rect x="202" y="140" width="70" height="18" rx="9" fill="#EEF6FF" />
				<text x="216" y="152" fontSize="8" fontFamily="system-ui" fill="#5DA3FF">#productivity</text>
			</g>

			{/* Selection indicator */}
			<g transform="translate(295, 190)">
				<circle r="16" fill="white" />
				<path d="M-6 0L-2 4L6 -4" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
			</g>

			{/* Info text */}
			<text x="170" y="228" fontSize="9" fontFamily="system-ui" fill="white" opacity="0.9" textAnchor="middle">
				Selected based on spaced repetition + your focus areas
			</text>

			<defs>
				<linearGradient id="selectionGradient" x1="170" y1="0" x2="170" y2="240" gradientUnits="userSpaceOnUse">
					<stop stopColor="#8B5CF6" />
					<stop offset="1" stopColor="#A78BFA" />
				</linearGradient>
				<filter id="selectedShadow" x="118" y="57" width="204" height="134" filterUnits="userSpaceOnUse">
					<feDropShadow dx="0" dy="8" stdDeviation="10" floodOpacity="0.25" />
				</filter>
			</defs>
		</svg>
	);
}
