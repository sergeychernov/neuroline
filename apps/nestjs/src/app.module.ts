import { Module } from '@nestjs/common';
import { InMemoryPipelineStorage } from 'neuroline';
import { NeurolineModule } from 'neuroline-nestjs';
import { demoPipeline } from 'demo-pipelines';

@Module({
	imports: [
		NeurolineModule.forRootAsync({
			useFactory: () => new InMemoryPipelineStorage(),
			logger: {
				info: (msg, data) => console.log(`[INFO] ${msg}`, data ?? ''),
				error: (msg, data) => console.error(`[ERROR] ${msg}`, data ?? ''),
				warn: (msg, data) => console.warn(`[WARN] ${msg}`, data ?? ''),
			},
			controllers: [
				{
					path: 'api/pipeline/demo',
					pipeline: demoPipeline,
					adminGuards: [], // открытый доступ к admin-эндпоинтам
				},
			],
			// Фоновый watchdog для отслеживания "зависших" джоб
			// Если джоба в processing дольше 20 минут — помечается как error
			staleJobsWatchdog: {
				checkIntervalMs: 60_000,     // проверка раз в минуту
				jobTimeoutMs: 20 * 60_000,   // таймаут 20 минут
			},
		}),
	],
})
export class AppModule {}
