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
					enableDebugEndpoints: true,
				},
			],
		}),
	],
})
export class AppModule {}
