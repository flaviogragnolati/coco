export const QA_TICKET_IMAGE_MAX_COUNT = 5;
export const QA_TICKET_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const QA_TICKET_LOG_MAX_BYTES = 1024 * 1024;

export const QA_TICKET_IMAGE_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
] as const;

export const QA_TICKET_CONSOLE_LOG_EXTENSIONS = ["txt", "log"] as const;
export const QA_TICKET_NETWORK_LOG_EXTENSIONS = ["har", "json", "txt"] as const;
