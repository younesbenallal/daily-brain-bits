export function SyncDashboardMockup() {
	return (
		<svg width="320" height="200" viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg">
			{/* Background */}
			<rect width="320" height="200" rx="12" fill="white" />
			<rect x="0.5" y="0.5" width="319" height="199" rx="11.5" stroke="#E5E5E5" />

			{/* Header */}
			<text x="20" y="32" fontSize="14" fontFamily="system-ui" fontWeight="600" fill="#111">
				Sync Status
			</text>
			<g transform="translate(260, 18)">
				<rect width="44" height="22" rx="11" fill="#DCFCE7" />
				<circle cx="12" cy="11" r="4" fill="#22C55E" />
				<text x="22" y="15" fontSize="9" fontFamily="system-ui" fontWeight="500" fill="#15803D">Live</text>
			</g>

			{/* Main Stat */}
			<text x="20" y="80" fontSize="36" fontFamily="system-ui" fontWeight="700" fill="#5DA3FF">
				1,247
			</text>
			<text x="20" y="100" fontSize="12" fontFamily="system-ui" fill="#6B7280">
				notes synced
			</text>

			{/* Progress Bar */}
			<rect x="20" y="118" width="280" height="8" rx="4" fill="#E5E5E5" />
			<rect x="20" y="118" width="238" height="8" rx="4" fill="url(#syncGradient)" />

			{/* Stats Grid */}
			<g transform="translate(20, 142)">
				{/* Reviewed */}
				<rect width="85" height="44" rx="8" fill="#F9FAFB" />
				<text x="12" y="20" fontSize="16" fontFamily="system-ui" fontWeight="600" fill="#111">847</text>
				<text x="12" y="34" fontSize="9" fontFamily="system-ui" fill="#6B7280">reviewed</text>
			</g>

			<g transform="translate(117, 142)">
				{/* Pending */}
				<rect width="85" height="44" rx="8" fill="#F9FAFB" />
				<text x="12" y="20" fontSize="16" fontFamily="system-ui" fontWeight="600" fill="#111">400</text>
				<text x="12" y="34" fontSize="9" fontFamily="system-ui" fill="#6B7280">pending</text>
			</g>

			<g transform="translate(214, 142)">
				{/* Last sync */}
				<rect width="86" height="44" rx="8" fill="#F9FAFB" />
				<text x="12" y="20" fontSize="14" fontFamily="system-ui" fontWeight="600" fill="#111">2m ago</text>
				<text x="12" y="34" fontSize="9" fontFamily="system-ui" fill="#6B7280">last sync</text>
			</g>

			<defs>
				<linearGradient id="syncGradient" x1="20" y1="122" x2="258" y2="122" gradientUnits="userSpaceOnUse">
					<stop stopColor="#5DA3FF" />
					<stop offset="1" stopColor="#99C5FF" />
				</linearGradient>
			</defs>
		</svg>
	);
}
