export function SourceConnectionMockup() {
	return (
		<svg width="360" height="180" viewBox="0 0 360 180" fill="none" xmlns="http://www.w3.org/2000/svg">
			{/* Background */}
			<rect width="360" height="180" rx="12" fill="white" />
			<rect x="0.5" y="0.5" width="359" height="179" rx="11.5" stroke="#E5E5E5" />

			{/* Notion Logo/Card */}
			<g transform="translate(40, 50)">
				<rect width="80" height="80" rx="12" fill="#FAFAFA" stroke="#E5E5E5" />
				{/* Notion icon simplified */}
				<rect x="22" y="20" width="36" height="40" rx="4" fill="white" stroke="#000" strokeWidth="2" />
				<path d="M28 28H52M28 36H44M28 44H48" stroke="#000" strokeWidth="2" strokeLinecap="round" />
				<text x="40" y="72" fontSize="9" fontFamily="system-ui" fontWeight="500" fill="#333" textAnchor="middle">Notion</text>
			</g>

			{/* Center Brain Icon */}
			<g transform="translate(156, 56)">
				<circle cx="24" cy="24" r="28" fill="#EEF6FF" stroke="#5DA3FF" strokeWidth="2" />
				{/* Brain simplified */}
				<path d="M24 16C20 16 17 19 17 22C17 24 18 25 18 25C16 26 15 28 15 30C15 33 17 35 20 35C21 35 22 34.5 23 34V34C23 34 23.5 35 24 35C24.5 35 25 34 25 34V34C26 34.5 27 35 28 35C31 35 33 33 33 30C33 28 32 26 30 25C30 25 31 24 31 22C31 19 28 16 24 16Z" stroke="#5DA3FF" strokeWidth="2" fill="none" />
				<path d="M24 20V32" stroke="#5DA3FF" strokeWidth="1.5" strokeDasharray="2 2" />
			</g>

			{/* Obsidian Logo/Card */}
			<g transform="translate(240, 50)">
				<rect width="80" height="80" rx="12" fill="#FAFAFA" stroke="#E5E5E5" />
				{/* Obsidian icon simplified */}
				<path d="M40 20L56 35L48 60H32L24 35L40 20Z" fill="#7C3AED" opacity="0.8" />
				<path d="M40 20L56 35L48 60H32L24 35L40 20Z" stroke="#7C3AED" strokeWidth="2" fill="none" />
				<text x="40" y="72" fontSize="9" fontFamily="system-ui" fontWeight="500" fill="#333" textAnchor="middle">Obsidian</text>
			</g>

			{/* Connection Lines */}
			<path d="M124 90H156" stroke="#5DA3FF" strokeWidth="2" strokeDasharray="4 4">
				<animate attributeName="stroke-dashoffset" from="8" to="0" dur="1s" repeatCount="indefinite" />
			</path>
			<path d="M204 90H236" stroke="#5DA3FF" strokeWidth="2" strokeDasharray="4 4">
				<animate attributeName="stroke-dashoffset" from="8" to="0" dur="1s" repeatCount="indefinite" />
			</path>

			{/* Connection dots */}
			<circle cx="140" cy="90" r="4" fill="#5DA3FF" />
			<circle cx="220" cy="90" r="4" fill="#5DA3FF" />

			{/* Status badges */}
			<g transform="translate(52, 135)">
				<rect width="56" height="20" rx="10" fill="#DCFCE7" />
				<circle cx="12" cy="10" r="3" fill="#22C55E" />
				<text x="20" y="14" fontSize="8" fontFamily="system-ui" fontWeight="500" fill="#15803D">Synced</text>
			</g>

			<g transform="translate(252, 135)">
				<rect width="56" height="20" rx="10" fill="#DCFCE7" />
				<circle cx="12" cy="10" r="3" fill="#22C55E" />
				<text x="20" y="14" fontSize="8" fontFamily="system-ui" fontWeight="500" fill="#15803D">Synced</text>
			</g>

			{/* Title */}
			<text x="180" y="24" fontSize="12" fontFamily="system-ui" fontWeight="600" fill="#333" textAnchor="middle">
				Your Knowledge Sources
			</text>
		</svg>
	);
}
