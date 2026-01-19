import type { Meta, StoryObj } from '@storybook/react';
import { PipelineViewer } from './PipelineViewer';
import type { PipelineDisplayData } from '../types';

const meta: Meta<typeof PipelineViewer> = {
  title: 'Components/PipelineViewer',
  component: PipelineViewer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    showArtifacts: {
      control: 'boolean',
    },
    showInput: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const processingPipeline: PipelineDisplayData = {
  pipelineId: 'pl_abc123def456',
  pipelineType: 'data-processing',
  status: 'processing',
  input: { url: 'https://api.example.com/data', userId: 'user-123' },
  stages: [
    {
      index: 0,
      jobs: [
        {
          name: 'fetch-data',
          status: 'done',
          startedAt: new Date(Date.now() - 15000),
          finishedAt: new Date(Date.now() - 10000),
          artifact: { data: '...', size: 1024 },
          errors: [],
        },
      ],
    },
    {
      index: 1,
      jobs: [
        {
          name: 'validate',
          status: 'done',
          startedAt: new Date(Date.now() - 10000),
          finishedAt: new Date(Date.now() - 8000),
          errors: [],
        },
        {
          name: 'notify-start',
          status: 'done',
          startedAt: new Date(Date.now() - 10000),
          finishedAt: new Date(Date.now() - 9000),
          errors: [],
        },
      ],
    },
    {
      index: 2,
      jobs: [
        {
          name: 'process-data',
          status: 'processing',
          startedAt: new Date(Date.now() - 5000),
          errors: [],
        },
      ],
    },
    {
      index: 3,
      jobs: [
        {
          name: 'save-result',
          status: 'pending',
          errors: [],
        },
      ],
    },
  ],
};

export const Processing: Story = {
  args: {
    pipeline: processingPipeline,
    showInput: true,
  },
};

const completedPipeline: PipelineDisplayData = {
  pipelineId: 'pl_xyz789',
  pipelineType: 'image-optimization',
  status: 'done',
  input: { imageUrl: 'https://example.com/image.jpg' },
  stages: [
    {
      index: 0,
      jobs: [
        {
          name: 'download-image',
          status: 'done',
          startedAt: new Date(Date.now() - 30000),
          finishedAt: new Date(Date.now() - 25000),
          artifact: { path: '/tmp/image.jpg', size: 2048000 },
          errors: [],
        },
      ],
    },
    {
      index: 1,
      jobs: [
        {
          name: 'resize-thumbnail',
          status: 'done',
          startedAt: new Date(Date.now() - 25000),
          finishedAt: new Date(Date.now() - 20000),
          artifact: { path: '/tmp/thumb.jpg' },
          errors: [],
        },
        {
          name: 'resize-medium',
          status: 'done',
          startedAt: new Date(Date.now() - 25000),
          finishedAt: new Date(Date.now() - 18000),
          artifact: { path: '/tmp/medium.jpg' },
          errors: [],
        },
        {
          name: 'resize-large',
          status: 'done',
          startedAt: new Date(Date.now() - 25000),
          finishedAt: new Date(Date.now() - 15000),
          artifact: { path: '/tmp/large.jpg' },
          errors: [],
        },
      ],
    },
    {
      index: 2,
      jobs: [
        {
          name: 'upload-to-cdn',
          status: 'done',
          startedAt: new Date(Date.now() - 15000),
          finishedAt: new Date(Date.now() - 5000),
          artifact: { cdnUrl: 'https://cdn.example.com/images/abc' },
          errors: [],
        },
      ],
    },
  ],
};

export const Completed: Story = {
  args: {
    pipeline: completedPipeline,
    showArtifacts: true,
  },
};

const errorPipeline: PipelineDisplayData = {
  pipelineId: 'pl_error123',
  pipelineType: 'data-sync',
  status: 'error',
  error: {
    message: 'Connection timeout after 30s',
    jobName: 'sync-to-external',
  },
  stages: [
    {
      index: 0,
      jobs: [
        {
          name: 'prepare-data',
          status: 'done',
          startedAt: new Date(Date.now() - 60000),
          finishedAt: new Date(Date.now() - 55000),
          errors: [],
        },
      ],
    },
    {
      index: 1,
      jobs: [
        {
          name: 'sync-to-external',
          status: 'error',
          startedAt: new Date(Date.now() - 55000),
          finishedAt: new Date(Date.now() - 25000),
          errors: [
            {
              message: 'Connection timeout after 30s',
              stack: 'Error: Connection timeout\n    at syncToExternal (sync.ts:123)',
              attempt: 0,
            },
          ],
        },
      ],
    },
    {
      index: 2,
      jobs: [
        {
          name: 'cleanup',
          status: 'pending',
          errors: [],
        },
      ],
    },
  ],
};

export const Error: Story = {
  args: {
    pipeline: errorPipeline,
  },
};

const simplePipeline: PipelineDisplayData = {
  pipelineId: 'pl_simple',
  pipelineType: 'simple-task',
  status: 'done',
  stages: [
    {
      index: 0,
      jobs: [
        {
          name: 'do-something',
          status: 'done',
          startedAt: new Date(Date.now() - 5000),
          finishedAt: new Date(Date.now() - 3000),
          artifact: 'Success!',
          errors: [],
        },
      ],
    },
  ],
};

export const Simple: Story = {
  args: {
    pipeline: simplePipeline,
    showArtifacts: true,
  },
};

