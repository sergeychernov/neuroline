import { NextRequest, NextResponse } from 'next/server';

/**
 * API роут для демонстрации работы с Pipeline
 * В реальном приложении здесь был бы PipelineManager
 */

// Демо pipeline конфигурация
const demoPipelineConfig = {
  name: 'demo-pipeline',
  stages: [
    { name: 'fetch-data' },
    { name: 'validate', parallel: ['notify-start'] },
    { name: 'transform-data' },
    { name: 'save-to-db', parallel: ['update-cache'] },
    { name: 'notify-complete' },
  ],
};

// Хранилище для демо (в реальности - MongoDB)
const pipelines = new Map<string, {
  id: string;
  status: 'processing' | 'done' | 'error';
  input: unknown;
  createdAt: Date;
}>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const pipelineId = `pl_${Date.now().toString(36)}`;
    
    const pipeline = {
      id: pipelineId,
      status: 'processing' as const,
      input: body.input || {},
      createdAt: new Date(),
    };
    
    pipelines.set(pipelineId, pipeline);

    return NextResponse.json({
      success: true,
      pipelineId,
      isNew: true,
      message: 'Pipeline started',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to start pipeline' },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pipelineId = searchParams.get('id');

  if (pipelineId) {
    const pipeline = pipelines.get(pipelineId);
    if (!pipeline) {
      return NextResponse.json(
        { success: false, error: 'Pipeline not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, pipeline });
  }

  // Возвращаем информацию об API
  return NextResponse.json({
    success: true,
    info: {
      description: 'Neuroline Pipeline API',
      endpoints: {
        'POST /api/network': {
          description: 'Start a new pipeline',
          body: {
            input: 'object - pipeline input data',
          },
        },
        'GET /api/network?id=<pipelineId>': {
          description: 'Get pipeline status',
        },
      },
      config: demoPipelineConfig,
    },
  });
}
