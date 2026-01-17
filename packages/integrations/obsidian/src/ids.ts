const duplicateSlashes = /\/+/g;
const backslashes = /\\/g;

export function normalizeVaultPath(path: string): string {
	return path.replace(backslashes, "/").replace(duplicateSlashes, "/");
}

export function buildExternalId(vaultId: string, path: string): string {
	return `${vaultId}::${normalizeVaultPath(path)}`;
}
