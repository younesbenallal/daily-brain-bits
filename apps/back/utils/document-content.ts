import { decryptContent } from "@daily-brain-bits/core";

type DocumentSnapshot = {
	contentCiphertext: string;
	contentIv: string;
	contentAlg: string;
	contentKeyVersion: number;
};

export function decodeDocumentContent(document: DocumentSnapshot | undefined): string {
	if (!document) {
		return "";
	}

	try {
		return decryptContent({
			ciphertext: document.contentCiphertext,
			iv: document.contentIv,
			alg: document.contentAlg,
			keyVersion: document.contentKeyVersion,
		});
	} catch (error) {
		console.error("Failed to decrypt document content:", error);
		return "";
	}
}
