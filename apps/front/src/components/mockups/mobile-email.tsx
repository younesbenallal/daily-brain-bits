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
			<rect x="8" y="88" width="184" height="76" fill="#EEF6FF" />
			<circle cx="30" cy="114" r="14" fill="#F5E1E7" />
			<text x="30" y="118" fontSize="11" fontFamily="system-ui" fontWeight="500" fill="#333" textAnchor="middle">D</text>
			<text x="52" y="106" fontSize="10" fontFamily="system-ui" fontWeight="600" fill="#000">Daily Brain Bits</text>
			<circle cx="176" cy="102" r="3" fill="#5DA3FF" />
			<text x="52" y="120" fontSize="9" fontFamily="system-ui" fontWeight="500" fill="#333">Your daily digest is ready</text>
			<text x="52" y="134" fontSize="8" fontFamily="system-ui" fill="#6B7280">Deep Work - Cal Newport</text>
			<text x="52" y="150" fontSize="7" fontFamily="system-ui" fill="#9CA3AF">Just now</text>

			{/* Other emails */}
			<rect x="8" y="164" width="184" height="64" fill="white" />
			<circle cx="30" cy="188" r="12" fill="#E5E5E5" />
			<rect x="52" y="180" width="70" height="7" rx="2" fill="#E5E5E5" />
			<rect x="52" y="192" width="110" height="5" rx="2" fill="#F0F0F0" />
			<rect x="52" y="202" width="90" height="5" rx="2" fill="#F0F0F0" />
			<text x="52" y="220" fontSize="7" fontFamily="system-ui" fill="#9CA3AF">Yesterday</text>

			<rect x="8" y="228" width="184" height="64" fill="white" />
			<circle cx="30" cy="252" r="12" fill="#E5E5E5" />
			<rect x="52" y="244" width="60" height="7" rx="2" fill="#E5E5E5" />
			<rect x="52" y="256" width="100" height="5" rx="2" fill="#F0F0F0" />
			<rect x="52" y="266" width="80" height="5" rx="2" fill="#F0F0F0" />
			<text x="52" y="284" fontSize="7" fontFamily="system-ui" fill="#9CA3AF">2 days ago</text>

			<rect x="8" y="292" width="184" height="64" fill="white" />
			<circle cx="30" cy="316" r="12" fill="#E5E5E5" />
			<rect x="52" y="308" width="80" height="7" rx="2" fill="#E5E5E5" />
			<rect x="52" y="320" width="95" height="5" rx="2" fill="#F0F0F0" />
			<rect x="52" y="330" width="70" height="5" rx="2" fill="#F0F0F0" />
			<text x="52" y="348" fontSize="7" fontFamily="system-ui" fill="#9CA3AF">3 days ago</text>

			{/* Home indicator */}
			<rect x="72" y="382" width="56" height="4" rx="2" fill="#1A1A1A" />
		</svg>
	);
}
