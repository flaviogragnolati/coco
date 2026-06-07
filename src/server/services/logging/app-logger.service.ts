import "server-only";

type LogContext = Record<string, unknown>;
type LogLevel = "debug" | "info" | "warn" | "error";

function mergeContext(
	baseContext: LogContext,
	context: LogContext | undefined,
): LogContext | undefined {
	const merged = { ...baseContext, ...(context ?? {}) };
	return Object.keys(merged).length > 0 ? merged : undefined;
}

export class AppLogger {
	constructor(private readonly baseContext: LogContext = {}) {}

	child(context: LogContext) {
		return new AppLogger({ ...this.baseContext, ...context });
	}

	debug(message: string, context?: LogContext) {
		this.write("debug", message, context);
	}

	info(message: string, context?: LogContext) {
		this.write("info", message, context);
	}

	warn(message: string, context?: LogContext) {
		this.write("warn", message, context);
	}

	error(message: string, context?: LogContext) {
		this.write("error", message, context);
	}

	domainEventPublished(context?: LogContext) {
		this.info("domainEventPublished", context);
	}

	outboxDispatchStarted(context?: LogContext) {
		this.info("outboxDispatchStarted", context);
	}

	outboxDispatchCompleted(context?: LogContext) {
		this.info("outboxDispatchCompleted", context);
	}

	outboxDispatchFailed(context?: LogContext) {
		this.error("outboxDispatchFailed", context);
	}

	trackingEventRecorded(context?: LogContext) {
		this.info("trackingEventRecorded", context);
	}

	trackingListenerFailed(context?: LogContext) {
		this.error("trackingListenerFailed", context);
	}

	trackingRetryScheduled(context?: LogContext) {
		this.warn("trackingRetryScheduled", context);
	}

	trackingRetryExhausted(context?: LogContext) {
		this.error("trackingRetryExhausted", context);
	}

	private write(level: LogLevel, message: string, context?: LogContext) {
		const payload = mergeContext(this.baseContext, context);
		const logger = console[level] ?? console.log;

		if (payload) {
			logger(`[${level}] ${message}`, payload);
			return;
		}

		logger(`[${level}] ${message}`);
	}
}

export const appLogger = new AppLogger();
