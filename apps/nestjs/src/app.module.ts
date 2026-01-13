import { Module } from '@nestjs/common';
import { PipelineManager, InMemoryPipelineStorage } from 'neuroline';
import { createPipelineController } from 'neuroline-nestjs';
import { demoPipeline } from 'demo-pipelines';

// Создаём storage и manager
const storage = new InMemoryPipelineStorage();
const manager = new PipelineManager({
	storage,
	logger: {
		info: (msg, data) => console.log(`[INFO] ${msg}`, data ?? ''),
		error: (msg, data) => console.error(`[ERROR] ${msg}`, data ?? ''),
		warn: (msg, data) => console.warn(`[WARN] ${msg}`, data ?? ''),
	},
});

// Создаём контроллер для demo pipeline
// API совместим с PipelineClient
const DemoPipelineController = createPipelineController({
	path: 'api/pipeline/demo',
	manager,
	storage,
	pipeline: demoPipeline,
});

@Module({
	controllers: [DemoPipelineController],
})
export class AppModule {}
