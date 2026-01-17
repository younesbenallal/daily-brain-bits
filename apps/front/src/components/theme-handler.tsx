import { useEffect, useState } from "react";

export function ThemeHandler() {
	const [isDark, setIsDark] = useState(false);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
			const dark = e.matches;
			setIsDark(dark);
			if (dark) {
				document.documentElement.classList.add("dark");
				document.documentElement.style.colorScheme = "dark";
			} else {
				document.documentElement.classList.remove("dark");
				document.documentElement.style.colorScheme = "light";
			}
		};

		handleChange(mediaQuery);
		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, []);

	useEffect(() => {
		// Update meta theme-color based on theme
		const meta = document.querySelector('meta[name="theme-color"]');
		const color = isDark ? "#03050a" : "#5da3ff"; // Matching --sky-top for both

		if (meta) {
			meta.setAttribute("content", color);
		} else {
			const newMeta = document.createElement("meta");
			newMeta.name = "theme-color";
			newMeta.content = color;
			document.head.appendChild(newMeta);
		}
	}, [isDark]);

	return null;
}
