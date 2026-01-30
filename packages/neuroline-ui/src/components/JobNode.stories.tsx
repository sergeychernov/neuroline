import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { JobNode } from './JobNode';

const meta: Meta<typeof JobNode> = {
  title: 'Components/JobNode',
  component: JobNode,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    isSelected: {
      control: 'boolean',
    },
  },
  args: {
    onClick: fn(),
    onRetry: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {
  args: {
    job: {
      name: 'fetch-data',
      status: 'pending',
      errors: [],
    },
  },
};

export const Processing: Story = {
  args: {
    job: {
      name: 'process-data',
      status: 'processing',
      startedAt: new Date(Date.now() - 5000),
      errors: [],
    },
  },
};

export const Done: Story = {
  args: {
    job: {
      name: 'save-result',
      status: 'done',
      startedAt: new Date(Date.now() - 10000),
      finishedAt: new Date(Date.now() - 2000),
      artifact: { saved: true, recordId: 'abc123' },
      errors: [],
    },
  },
};

export const Error: Story = {
  args: {
    job: {
      name: 'validate-input',
      status: 'error',
      startedAt: new Date(Date.now() - 3000),
      finishedAt: new Date(Date.now() - 1000),
      errors: [
        {
          message: 'Validation failed: missing required field "email"',
          stack: 'Error: Validation failed\n    at validateInput (job.ts:42)',
          attempt: 0,
        },
      ],
    },
  },
};

export const Selected: Story = {
  args: {
    job: {
      name: 'transform-data',
      status: 'done',
      startedAt: new Date(Date.now() - 8000),
      finishedAt: new Date(Date.now() - 4000),
      errors: [],
    },
    isSelected: true,
  },
};

export const LongName: Story = {
  args: {
    job: {
      name: 'very-long-job-name-that-might-need-wrapping',
      status: 'processing',
      startedAt: new Date(),
      errors: [],
    },
  },
};

export const RetryButtonOnly: Story = {
  args: {
    job: {
      name: 'simple-job',
      status: 'error',
      startedAt: new Date(Date.now() - 5000),
      finishedAt: new Date(Date.now() - 1000),
      errors: [{ message: 'Something went wrong', attempt: 0 }],
      // Нет retryCount/maxRetries — только кнопка с иконкой
    },
  },
};

export const WithoutOnRetry: Story = {
  args: {
    job: {
      name: 'view-only-job',
      status: 'done',
      startedAt: new Date(Date.now() - 5000),
      finishedAt: new Date(Date.now() - 1000),
      errors: [],
    },
    onRetry: undefined, // Нет callback — нет кнопки retry
  },
};

export const WithRetryConfigured: Story = {
  args: {
    job: {
      name: 'resilient-job',
      status: 'processing',
      startedAt: new Date(Date.now() - 1000),
      retryCount: 0,
      maxRetries: 3,
      errors: [],
    },
  },
};

export const RetryInProgress: Story = {
  args: {
    job: {
      name: 'unstable-api-call',
      status: 'processing',
      startedAt: new Date(Date.now() - 2000),
      retryCount: 1,
      maxRetries: 3,
      errors: [
        {
          message: 'Connection timeout',
          attempt: 0,
        },
      ],
    },
  },
};

export const RetrySucceeded: Story = {
  args: {
    job: {
      name: 'flaky-service',
      status: 'done',
      startedAt: new Date(Date.now() - 15000),
      finishedAt: new Date(Date.now() - 1000),
      retryCount: 2,
      maxRetries: 3,
      artifact: { success: true },
      errors: [
        {
          message: 'Service unavailable',
          attempt: 0,
        },
        {
          message: 'Rate limit exceeded',
          attempt: 1,
        },
      ],
    },
  },
};

export const RetryExhausted: Story = {
  args: {
    job: {
      name: 'external-api',
      status: 'error',
      startedAt: new Date(Date.now() - 30000),
      finishedAt: new Date(Date.now() - 1000),
      retryCount: 3,
      maxRetries: 3,
      errors: [
        {
          message: 'Connection refused',
          attempt: 0,
        },
        {
          message: 'Connection refused',
          attempt: 1,
        },
        {
          message: 'Connection refused',
          stack: 'Error: Connection refused\n    at fetch (api.ts:15)',
          attempt: 2,
        },
      ],
    },
  },
};

