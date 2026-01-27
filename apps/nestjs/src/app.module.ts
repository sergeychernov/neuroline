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
					// Асинхронное получение jobOptions для базового POST
					// В реальном приложении здесь можно получать данные из request.user, headers и т.д.
					getJobOptions: async (input, request) => {
						// Пример: те же опции, что передаются в админке через startWithOptions
						return {
							compute: {
								multiplier: 2.0,
								iterationDelayMs: 80,
							},
						};
					},
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
export class AppModule { }
