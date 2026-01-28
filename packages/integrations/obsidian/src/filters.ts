import { normalizeVaultPath } from "./ids";

const specialChars = /[.+^${}()|[\]\\]/g;

function escapeRegex(value: string): string {
	return value.replace(specialChars, "\\$&");
}

export function globToRegExp(pattern: string): RegExp {
	const normalized = normalizeVaultPath(pattern);
	let regex: string = "^";

	for (let i = 0; i < normalized.length; i += 1) {
		const char = normalized.charAt(i);
		if (char === "*") {
			if (normalized[i + 1] === "*") {
				regex += ".*";
				i += 1;
			} else {
				regex += "[^/]*";
			}
			continue;
		}
		if (char === "?") {
			regex += "[^/]";
			continue;
		}
		if (char === "/") {
			regex += "/";
			continue;
		}
		regex += escapeRegex(char);
	}

	regex += "$";
	return new RegExp(regex);
}

export function matchesGlob(path: string, pattern: string): boolean {
	return globToRegExp(pattern).test(normalizeVaultPath(path));
}

function stripMdExtension(path: string): string {
	return path.endsWith(".md") ? path.slice(0, -3) : path;
}

export function createPathFilter(options: { include?: string[]; exclude?: string[] }): (path: string) => boolean {
	const includePatterns = (options.include || []).filter(Boolean);
	const excludePatterns = (options.exclude || []).filter(Boolean);
	const includeRegs = includePatterns.map((pattern) => globToRegExp(pattern));
	const excludeRegs = excludePatterns.map((pattern) => globToRegExp(pattern));

	return (path: string) => {
		const normalized = stripMdExtension(normalizeVaultPath(path));
		if (excludeRegs.some((regex) => regex.test(normalized))) {
			return false;
		}
		if (includeRegs.length === 0) {
			return true;
		}
		return includeRegs.some((regex) => regex.test(normalized));
	};
}
