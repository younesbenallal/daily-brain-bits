export function NoteCardMockup() {
	return (
		<svg width="320" height="380" viewBox="0 0 320 380" fill="none" xmlns="http://www.w3.org/2000/svg">
			{/* Card Background */}
			<rect width="320" height="380" rx="12" fill="white" />
			<rect x="0.5" y="0.5" width="319" height="379" rx="11.5" stroke="#EDEDED" />

			{/* Image Banner with gradient fade */}
			<defs>
				<linearGradient id="imageFade" x1="160" y1="80" x2="160" y2="140" gradientUnits="userSpaceOnUse">
					<stop stopColor="#E8F4FD" />
					<stop offset="1" stopColor="white" />
				</linearGradient>
				<pattern id="dotsPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
					<circle cx="2" cy="2" r="1" fill="#C4DEF6" />
				</pattern>
			</defs>

			{/* Decorative header */}
			<rect x="0" y="0" width="320" height="100" rx="12" fill="#E8F4FD" />
			<rect x="0" y="12" width="320" height="88" fill="#E8F4FD" />
			<rect x="0" y="60" width="320" height="80" fill="url(#imageFade)" />
			<rect x="0" y="0" width="320" height="100" fill="url(#dotsPattern)" opacity="0.5" />

			{/* Decorative shapes */}
			<circle cx="60" cy="40" r="20" fill="#B8D8F8" opacity="0.6" />
			<circle cx="260" cy="50" r="15" fill="#D4E8FC" opacity="0.5" />
			<rect x="140" y="25" width="40" height="40" rx="8" fill="#A8D0F5" opacity="0.4" transform="rotate(15 160 45)" />

			{/* Title */}
			<text x="24" y="140" fontSize="20" fontFamily="Georgia, serif" fontWeight="600" fill="#68A5F1">
				The Art of Deep Work
			</text>

			{/* Content */}
			<text x="24" y="170" fontSize="11" fontFamily="system-ui" fill="#404040">
				<tspan x="24" dy="0">Cal Newport defines deep work as the</tspan>
				<tspan x="24" dy="16">ability to focus without distraction on a</tspan>
				<tspan x="24" dy="16">cognitively demanding task. This skill is</tspan>
				<tspan x="24" dy="16">becoming increasingly rare and valuable.</tspan>
			</text>

			{/* Quiz Question */}
			<text x="24" y="260" fontSize="11" fontFamily="system-ui" fontWeight="500" fill="#1F2937">
				What is deep work according to Newport?
			</text>

			{/* Quiz Options */}
			<rect x="24" y="278" width="130" height="32" rx="16" fill="white" stroke="#D1D5DB" />
			<text x="40" y="299" fontSize="10" fontFamily="system-ui" fontWeight="500" fill="#4B5563">A. Multitasking</text>

			<rect x="166" y="278" width="130" height="32" rx="16" fill="white" stroke="#D1D5DB" />
			<text x="182" y="299" fontSize="10" fontFamily="system-ui" fontWeight="500" fill="#4B5563">B. Focused work</text>

			<rect x="24" y="318" width="130" height="32" rx="16" fill="white" stroke="#D1D5DB" />
			<text x="40" y="339" fontSize="10" fontFamily="system-ui" fontWeight="500" fill="#4B5563">C. Long hours</text>

			<rect x="166" y="318" width="130" height="32" rx="16" fill="white" stroke="#D1D5DB" />
			<text x="182" y="339" fontSize="10" fontFamily="system-ui" fontWeight="500" fill="#4B5563">D. Remote work</text>

			{/* Footer Icons */}
			<g transform="translate(24, 360)">
				{/* Hashtag icon */}
				<path d="M4 6H12M4 10H12M6 4V12M10 4V12" stroke="#525252" strokeWidth="1.5" strokeLinecap="round" />
			</g>

			<g transform="translate(280, 360)">
				{/* Arrow up icon */}
				<path d="M8 12V4M4 8L8 4L12 8" stroke="#525252" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
			</g>
		</svg>
	);
}
