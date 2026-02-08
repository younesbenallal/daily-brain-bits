export function SpacedRepetitionMockup() {
	return (
		<svg width="360" height="200" viewBox="0 0 360 200" fill="none" xmlns="http://www.w3.org/2000/svg">
			{/* Background */}
			<rect width="360" height="200" rx="12" fill="white" />
			<rect x="0.5" y="0.5" width="359" height="199" rx="11.5" stroke="#E5E5E5" />

			{/* Title */}
			<text x="20" y="28" fontSize="13" fontFamily="system-ui" fontWeight="600" fill="#111">
				Memory Retention Curve
			</text>
			<text x="20" y="44" fontSize="10" fontFamily="system-ui" fill="#6B7280">
				Optimal review intervals for long-term memory
			</text>

			{/* Y-axis */}
			<line x1="40" y1="60" x2="40" y2="170" stroke="#E5E5E5" strokeWidth="1" />
			<text x="14" y="68" fontSize="8" fontFamily="system-ui" fill="#9CA3AF">100%</text>
			<text x="20" y="122" fontSize="8" fontFamily="system-ui" fill="#9CA3AF">50%</text>
			<text x="24" y="172" fontSize="8" fontFamily="system-ui" fill="#9CA3AF">0%</text>

			{/* X-axis */}
			<line x1="40" y1="170" x2="340" y2="170" stroke="#E5E5E5" strokeWidth="1" />

			{/* Grid lines */}
			<line x1="40" y1="115" x2="340" y2="115" stroke="#F3F4F6" strokeWidth="1" strokeDasharray="4 4" />

			{/* Forgetting curve (red, declining) */}
			<path d="M40 70 Q100 90 140 130 Q180 155 340 165" stroke="#FCA5A5" strokeWidth="2" fill="none" strokeDasharray="4 4" />
			<text x="280" y="158" fontSize="8" fontFamily="system-ui" fill="#EF4444">Without review</text>

			{/* Retention curve with reviews (blue, maintained) */}
			<path d="M40 70 L80 85 L80 72 L140 92 L140 75 L220 100 L220 78 L320 95" stroke="#5DA3FF" strokeWidth="2.5" fill="none" />

			{/* Review points */}
			<circle cx="80" cy="72" r="6" fill="#5DA3FF" />
			<circle cx="140" cy="75" r="6" fill="#5DA3FF" />
			<circle cx="220" cy="78" r="6" fill="#5DA3FF" />
			<circle cx="320" cy="95" r="6" fill="#5DA3FF" />

			{/* Review labels */}
			<text x="72" y="62" fontSize="7" fontFamily="system-ui" fontWeight="500" fill="#5DA3FF">Day 1</text>
			<text x="130" y="65" fontSize="7" fontFamily="system-ui" fontWeight="500" fill="#5DA3FF">Day 3</text>
			<text x="208" y="68" fontSize="7" fontFamily="system-ui" fontWeight="500" fill="#5DA3FF">Day 7</text>
			<text x="304" y="85" fontSize="7" fontFamily="system-ui" fontWeight="500" fill="#5DA3FF">Day 30</text>

			{/* Time labels */}
			<text x="76" y="184" fontSize="8" fontFamily="system-ui" fill="#9CA3AF">1d</text>
			<text x="136" y="184" fontSize="8" fontFamily="system-ui" fill="#9CA3AF">3d</text>
			<text x="216" y="184" fontSize="8" fontFamily="system-ui" fill="#9CA3AF">7d</text>
			<text x="312" y="184" fontSize="8" fontFamily="system-ui" fill="#9CA3AF">30d</text>

			{/* Legend */}
			<g transform="translate(240, 28)">
				<rect x="0" y="0" width="8" height="8" rx="2" fill="#5DA3FF" />
				<text x="12" y="7" fontSize="8" fontFamily="system-ui" fill="#6B7280">With DBB</text>
			</g>
		</svg>
	);
}
