export function MobileEmailMockup() {
	return (
		<svg width="200" height="400" viewBox="0 0 200 400" fill="none" xmlns="http://www.w3.org/2000/svg">
			{/* Phone Frame */}
			<rect x="4" y="4" width="192" height="392" rx="32" fill="#1A1A1A" />
			<rect x="8" y="8" width="184" height="384" rx="28" fill="white" />

			{/* Dynamic Island */}
			<rect x="70" y="14" width="60" height="24" rx="12" fill="#1A1A1A" />

			{/* Status Bar */}
			<text x="20" y="28" fontSize="10" fontFamily="system-ui" fontWeight="600" fill="#000">9:41</text>
			<g transform="translate(156, 18)">
				{/* Signal */}
				<rect x="0" y="6" width="3" height="4" rx="0.5" fill="#000" />
				<rect x="4" y="4" width="3" height="6" rx="0.5" fill="#000" />
				<rect x="8" y="2" width="3" height="8" rx="0.5" fill="#000" />
				<rect x="12" y="0" width="3" height="10" rx="0.5" fill="#000" />
				{/* Battery */}
				<rect x="20" y="2" width="16" height="8" rx="2" stroke="#000" strokeWidth="1" fill="none" />
				<rect x="22" y="4" width="10" height="4" rx="1" fill="#000" />
			</g>

			{/* Email App Header */}
			<rect x="8" y="44" width="184" height="44" fill="#F9FAFB" />
			<text x="20" y="70" fontSize="16" fontFamily="system-ui" fontWeight="600" fill="#000">Inbox</text>
			<circle cx="172" cy="66" r="14" fill="#EEF6FF" />
			<text x="172" y="70" fontSize="10" fontFamily="system-ui" fontWeight="600" fill="#5DA3FF" textAnchor="middle">3</text>

			{/* Email Item - DBB (highlighted) */}
			<rect x="8" y="88" width="184" height="80" fill="#EEF6FF" />
			<circle cx="32" cy="116" r="16" fill="#F5E1E7" />
			<text x="32" y="120" fontSize="12" fontFamily="system-ui" fontWeight="500" fill="#333" textAnchor="middle">D</text>
			<text x="56" y="108" fontSize="11" fontFamily="system-ui" fontWeight="600" fill="#000">Daily Brain Bits</text>
			<text x="56" y="122" fontSize="10" fontFamily="system-ui" fontWeight="500" fill="#333">Your daily knowledge refresh</text>
			<text x="56" y="138" fontSize="9" fontFamily="system-ui" fill="#6B7280">The Art of Deep Work - Cal Newport...</text>
			<text x="56" y="154" fontSize="8" fontFamily="system-ui" fill="#9CA3AF">Just now</text>
			<circle cx="172" cy="108" r="4" fill="#5DA3FF" />

			{/* Other emails */}
			<rect x="8" y="168" width="184" height="70" fill="white" />
			<circle cx="32" cy="194" r="14" fill="#E5E5E5" />
			<rect x="56" y="184" width="80" height="8" rx="2" fill="#E5E5E5" />
			<rect x="56" y="198" width="120" height="6" rx="2" fill="#F0F0F0" />
			<rect x="56" y="210" width="100" height="6" rx="2" fill="#F0F0F0" />
			<text x="56" y="230" fontSize="8" fontFamily="system-ui" fill="#9CA3AF">Yesterday</text>

			<rect x="8" y="238" width="184" height="70" fill="white" />
			<circle cx="32" cy="264" r="14" fill="#E5E5E5" />
			<rect x="56" y="254" width="70" height="8" rx="2" fill="#E5E5E5" />
			<rect x="56" y="268" width="110" height="6" rx="2" fill="#F0F0F0" />
			<rect x="56" y="280" width="90" height="6" rx="2" fill="#F0F0F0" />
			<text x="56" y="300" fontSize="8" fontFamily="system-ui" fill="#9CA3AF">2 days ago</text>

			<rect x="8" y="308" width="184" height="70" fill="white" />
			<circle cx="32" cy="334" r="14" fill="#E5E5E5" />
			<rect x="56" y="324" width="90" height="8" rx="2" fill="#E5E5E5" />
			<rect x="56" y="338" width="100" height="6" rx="2" fill="#F0F0F0" />
			<rect x="56" y="350" width="80" height="6" rx="2" fill="#F0F0F0" />
			<text x="56" y="370" fontSize="8" fontFamily="system-ui" fill="#9CA3AF">3 days ago</text>

			{/* Home indicator */}
			<rect x="72" y="382" width="56" height="4" rx="2" fill="#1A1A1A" />
		</svg>
	);
}
