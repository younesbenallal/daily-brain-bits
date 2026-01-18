type DocumentSnapshot = {
	contentCiphertext: string;
	contentAlg: string;
};

export function decodeDocumentContent(document: DocumentSnapshot | undefined): string {
	if (!document || document.contentAlg !== "none") {
		return "";
	}
	try {
		return Buffer.from(document.contentCiphertext, "base64").toString("utf8");
	} catch {
		return "";
	}
}
