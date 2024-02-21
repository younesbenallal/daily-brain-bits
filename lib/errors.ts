export class ApiError extends Error {
	statusCode: HttpStatusCode;
	constructor(message: string, statusCode: HttpStatusCode) {
		super(message); // (1)
		this.statusCode = statusCode; // (2)
	}
}

type HttpStatusCode = 200 | 201 | 301 | 400 | 401 | 402 | 403 | 404 | 405 | 500;
