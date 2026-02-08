export function CalendarScheduleMockup() {
	return (
		<svg width="300" height="220" viewBox="0 0 300 220" fill="none" xmlns="http://www.w3.org/2000/svg">
			{/* Background */}
			<rect width="300" height="220" rx="12" fill="white" />
			<rect x="0.5" y="0.5" width="299" height="219" rx="11.5" stroke="#E5E5E5" />

			{/* Header */}
			<text x="20" y="28" fontSize="13" fontFamily="system-ui" fontWeight="600" fill="#111">
				Digest Schedule
			</text>
			<g transform="translate(200, 14)">
				<rect width="80" height="24" rx="12" fill="#EEF6FF" />
				<text x="12" y="16" fontSize="10" fontFamily="system-ui" fill="#5DA3FF">🕐 8:00 AM</text>
			</g>

			{/* Day labels */}
			<g transform="translate(20, 52)">
				{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
					<text key={day} x={i * 38 + 16} y="0" fontSize="9" fontFamily="system-ui" fontWeight="500" fill="#9CA3AF" textAnchor="middle">
						{day}
					</text>
				))}
			</g>

			{/* Calendar grid */}
			<g transform="translate(20, 66)">
				{/* Week 1 */}
				{[1, 2, 3, 4, 5, 6, 7].map((day, i) => (
					<g key={`w1-${day}`} transform={`translate(${i * 38}, 0)`}>
						<rect width="32" height="32" rx="8" fill={[0, 2, 4].includes(i) ? "#5DA3FF" : "#F9FAFB"} />
						<text x="16" y="20" fontSize="11" fontFamily="system-ui" fontWeight="500" fill={[0, 2, 4].includes(i) ? "white" : "#6B7280"} textAnchor="middle">
							{day}
						</text>
					</g>
				))}

				{/* Week 2 */}
				{[8, 9, 10, 11, 12, 13, 14].map((day, i) => (
					<g key={`w2-${day}`} transform={`translate(${i * 38}, 40)`}>
						<rect width="32" height="32" rx="8" fill={[0, 2, 4].includes(i) ? "#5DA3FF" : "#F9FAFB"} />
						<text x="16" y="20" fontSize="11" fontFamily="system-ui" fontWeight="500" fill={[0, 2, 4].includes(i) ? "white" : "#6B7280"} textAnchor="middle">
							{day}
						</text>
					</g>
				))}

				{/* Week 3 */}
				{[15, 16, 17, 18, 19, 20, 21].map((day, i) => (
					<g key={`w3-${day}`} transform={`translate(${i * 38}, 80)`}>
						<rect width="32" height="32" rx="8" fill={[0, 2, 4].includes(i) ? "#5DA3FF" : "#F9FAFB"} />
						<text x="16" y="20" fontSize="11" fontFamily="system-ui" fontWeight="500" fill={[0, 2, 4].includes(i) ? "white" : "#6B7280"} textAnchor="middle">
							{day}
						</text>
					</g>
				))}
			</g>

			{/* Legend */}
			<g transform="translate(20, 192)">
				<rect width="12" height="12" rx="4" fill="#5DA3FF" />
				<text x="18" y="10" fontSize="9" fontFamily="system-ui" fill="#6B7280">Digest days</text>
				<rect x="100" y="0" width="12" height="12" rx="4" fill="#F9FAFB" stroke="#E5E5E5" />
				<text x="118" y="10" fontSize="9" fontFamily="system-ui" fill="#6B7280">Rest days</text>
			</g>
		</svg>
	);
}
