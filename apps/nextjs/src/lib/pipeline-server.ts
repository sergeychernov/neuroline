/**
 * Серверная конфигурация Pipeline Manager
 * Этот файл используется только на сервере (API routes)
 */

import { PipelineManager, InMemoryPipelineStorage, type PipelineStorage } from 'neuroline';
import { MongoPipelineStorage, PipelineSchema, type MongoPipelineDocument } from 'neuroline/mongo';
import mongoose, { type Model } from 'mongoose';

// ============================================================================
// Singleton instances
// ============================================================================

let managerInstance: PipelineManager | null = null;
let storageInstance: PipelineStorage | null = null;
let mongoConnectPromise: Promise<void> | null = null;

/**
 * Возвращает true, если MongoDB включён (через env).
 * Используем это на Vercel, чтобы хранить состояние pipeline между запросами.
 */
export const isMongoEnabled = (): boolean => Boolean(process.env.MONGODB_URI);

/**
 * Подключение к MongoDB (с кэшированием promise), безопасно для serverless.
 */
async function ensureMongoConnected(): Promise<void> {
	const uri = process.env.MONGODB_URI;
	if (!uri) return;

	// Validate MongoDB URI format
	if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
		throw new Error(
			`Invalid MONGODB_URI format: URI must start with "mongodb://" or "mongodb+srv://", got "${uri.substring(0, 20)}..."`,
		);
	}

	// 1 = connected, 2 = connecting
	if (mongoose.connection.readyState === 1) return;
	if (mongoose.connection.readyState === 2 && mongoConnectPromise) {
		await mongoConnectPromise;
		return;
	}

	mongoConnectPromise = mongoose.connect(uri).then(() => undefined);

	try {
		await mongoConnectPromise;
	} catch (error) {
		// Позволяем повторить подключение при следующем запросе
		mongoConnectPromise = null;
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to connect to MongoDB: ${message}. Check your MONGODB_URI environment variable.`);
	}
}

function getMongoPipelineModel(): Model<MongoPipelineDocument> {
	// Модель кэшируется внутри mongoose между hot-reload/инстансами
	const existing = mongoose.models.Pipeline as Model<MongoPipelineDocument> | undefined;
	return existing ?? mongoose.model<MongoPipelineDocument>('Pipeline', PipelineSchema);
}

/**
 * Гарантирует готовность storage (например, Mongo connect) перед обработкой API запроса.
 */
export async function ensurePipelineStorageReady(): Promise<void> {
	if (isMongoEnabled()) {
		await ensureMongoConnected();
	}
}

/**
 * Получает или создаёт singleton инстансы PipelineManager и Storage
 */
export function getPipelineManager() {
	if (!managerInstance) {
		if (isMongoEnabled()) {
			const model = getMongoPipelineModel();
			storageInstance = new MongoPipelineStorage(model);
		} else {
			storageInstance = new InMemoryPipelineStorage();
		}

		managerInstance = new PipelineManager({
			storage: storageInstance,
			logger: {
				info: (msg, data) => console.log(`[INFO] ${msg}`, data),
				error: (msg, data) => console.error(`[ERROR] ${msg}`, data),
				warn: (msg, data) => console.warn(`[WARN] ${msg}`, data),
			},
		});

		// Запускаем фоновый watchdog для отслеживания "зависших" джоб
		// Если джоба в processing дольше 20 минут — помечается как error
		// Полезно когда процесс падает во время выполнения джобы
		managerInstance.startStaleJobsWatchdog({
			checkIntervalMs: 60_000,     // проверка раз в минуту
			jobTimeoutMs: 20 * 60_000,   // таймаут 20 минут
		});
	}
	return { manager: managerInstance, storage: storageInstance! };
}

