import type { Meta, StoryObj } from '@storybook/react';
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
    showArtifact: {
      control: 'boolean',
    },
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
    showArtifact: true,
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

