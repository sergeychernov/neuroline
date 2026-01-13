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
		throw error;
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
	}
	return { manager: managerInstance, storage: storageInstance! };
}

