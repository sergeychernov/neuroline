import { Module } from '@nestjs/common';
import { PipelineManager, InMemoryPipelineStorage } from 'neuroline';
import { NeurolineModule } from 'neuroline-nestjs';
import { demoPipeline, parallelPipeline } from './pipelines';

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

@Module({
  imports: [
    // Регистрируем Neuroline модуль
    NeurolineModule.register({
      manager,
      storage,
      pipelines: [demoPipeline, parallelPipeline],
      isGlobal: true,
    }),
  ],
})
export class AppModule {}

