export function EmailClientMockup() {
	return (
		<svg width="480" height="360" viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg">
			{/* Window Frame */}
			<rect width="480" height="360" rx="12" fill="white" />
			<rect x="0.5" y="0.5" width="479" height="359" rx="11.5" stroke="#E5E5E5" />

			{/* Title Bar */}
			<rect width="480" height="28" rx="12" fill="#F8F8F8" />
			<rect y="12" width="480" height="16" fill="#F8F8F8" />

			{/* Window Controls */}
			<circle cx="16" cy="14" r="5" fill="#FF5F57" />
			<circle cx="32" cy="14" r="5" fill="#FEBC2E" />
			<circle cx="48" cy="14" r="5" fill="#28C840" />

			{/* Sidebar */}
			<rect y="28" width="128" height="332" fill="#F4F4F4" />
			<line x1="128" y1="28" x2="128" y2="360" stroke="#EFEFEF" />

			{/* Sidebar - Email Item */}
			<rect x="8" y="40" width="112" height="72" rx="6" fill="white" />
			<rect x="8" y="40" width="112" height="72" rx="6" stroke="#E8E8E8" strokeWidth="0.5" />

			{/* Avatar */}
			<rect x="14" y="48" width="24" height="24" rx="12" fill="#F5E1E7" />
			<text x="22" y="65" fontSize="12" fontFamily="system-ui" fill="#333" textAnchor="middle">D</text>

			{/* Sender Name */}
			<text x="44" y="58" fontSize="10" fontFamily="system-ui" fontWeight="500" fill="#000">Daily Brain Bits</text>

			{/* Preview Text */}
			<text x="14" y="82" fontSize="8" fontFamily="system-ui" fill="#888">
				<tspan x="14" dy="0">Your daily knowledge refresh</tspan>
				<tspan x="14" dy="10">is ready to review...</tspan>
			</text>

			{/* Unread Indicator */}
			<circle cx="110" cy="52" r="4" fill="#5DA3FF" />

			{/* Other email items (faded) */}
			<rect x="8" y="120" width="112" height="56" rx="6" fill="#FAFAFA" />
			<rect x="14" y="128" width="60" height="8" rx="2" fill="#E0E0E0" />
			<rect x="14" y="142" width="90" height="6" rx="2" fill="#EEEEEE" />
			<rect x="14" y="152" width="70" height="6" rx="2" fill="#EEEEEE" />

			<rect x="8" y="184" width="112" height="56" rx="6" fill="#FAFAFA" />
			<rect x="14" y="192" width="55" height="8" rx="2" fill="#E0E0E0" />
			<rect x="14" y="206" width="85" height="6" rx="2" fill="#EEEEEE" />
			<rect x="14" y="216" width="65" height="6" rx="2" fill="#EEEEEE" />

			{/* Main Content Area */}
			<rect x="136" y="36" width="336" height="316" fill="url(#emailGradient)" />

			{/* Email Content Card */}
			<rect x="160" y="80" width="288" height="240" rx="10" fill="white" filter="url(#cardShadow)" />

			{/* Card Title */}
			<text x="180" y="120" fontSize="16" fontFamily="Georgia, serif" fontWeight="600" fill="#68A5F1">
				The Psychology of
			</text>
			<text x="180" y="140" fontSize="16" fontFamily="Georgia, serif" fontWeight="600" fill="#68A5F1">
				Learning Retention
			</text>

			{/* Card Content */}
			<text x="180" y="168" fontSize="10" fontFamily="system-ui" fill="#404040">
				<tspan x="180" dy="0">Spaced repetition leverages the spacing</tspan>
				<tspan x="180" dy="14">effect to optimize long-term memory.</tspan>
				<tspan x="180" dy="14">By reviewing information at strategic</tspan>
				<tspan x="180" dy="14">intervals, retention improves significantly.</tspan>
			</text>

			{/* Tags/Actions */}
			<rect x="180" y="240" width="60" height="24" rx="12" fill="#F3F4F6" />
			<text x="198" y="256" fontSize="9" fontFamily="system-ui" fill="#6B7280">#learning</text>

			<rect x="248" y="240" width="70" height="24" rx="12" fill="#F3F4F6" />
			<text x="268" y="256" fontSize="9" fontFamily="system-ui" fill="#6B7280">#memory</text>

			{/* Action Icons */}
			<circle cx="180" cy="292" r="12" fill="#F9FAFB" />
			<path d="M176 292L180 288L184 292M180 288V296" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

			<circle cx="210" cy="292" r="12" fill="#F9FAFB" />
			<path d="M206 295L210 291L214 295M206 289L210 293L214 289" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

			{/* Gradients and Filters */}
			<defs>
				<linearGradient id="emailGradient" x1="304" y1="36" x2="304" y2="352" gradientUnits="userSpaceOnUse">
					<stop stopColor="#5DA3FF" />
					<stop offset="1" stopColor="#99C5FF" />
				</linearGradient>
				<filter id="cardShadow" x="152" y="76" width="304" height="256" filterUnits="userSpaceOnUse">
					<feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.1" />
				</filter>
			</defs>
		</svg>
	);
}
