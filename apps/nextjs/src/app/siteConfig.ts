export const SITE_LINKS = {
  githubRepo: 'https://github.com/sergeychernov/neuroline',
  githubIssues: 'https://github.com/sergeychernov/neuroline/issues',
  npmSearch: 'https://www.npmjs.com/search?q=neuroline',
} as const;

export const SITE_BACKGROUND = `
  radial-gradient(ellipse at 10% 20%, rgba(124, 77, 255, 0.12) 0%, transparent 50%),
  radial-gradient(ellipse at 90% 80%, rgba(0, 229, 255, 0.08) 0%, transparent 50%),
  linear-gradient(135deg, #050508 0%, #0a0a12 50%, #0f0f1a 100%)
`;

export type PackageId = 'neuroline' | 'neuroline-ui' | 'neuroline-nextjs' | 'neuroline-nestjs';

export const PACKAGES: Record<
  PackageId,
  {
    id: PackageId;
    title: string;
    description: string;
    npmUrl: string;
    githubDirUrl: string;
    githubReadmeUrl: string;
    storybookReadmeUrl?: string;
  }
> = {
  neuroline: {
    id: 'neuroline',
    title: 'neuroline',
    description:
      'Framework-agnostic pipeline orchestration with typed jobs and pluggable storage.',
    npmUrl: 'https://www.npmjs.com/package/neuroline',
    githubDirUrl: 'https://github.com/sergeychernov/neuroline/tree/main/packages/neuroline',
    githubReadmeUrl: 'https://github.com/sergeychernov/neuroline/blob/main/packages/neuroline/README.md',
  },
  'neuroline-ui': {
    id: 'neuroline-ui',
    title: 'neuroline-ui',
    description: 'React UI components for visualizing Neuroline pipelines with MUI.',
    npmUrl: 'https://www.npmjs.com/package/neuroline-ui',
    githubDirUrl: 'https://github.com/sergeychernov/neuroline/tree/main/packages/neuroline-ui',
    githubReadmeUrl: 'https://github.com/sergeychernov/neuroline/blob/main/packages/neuroline-ui/README.md',
    storybookReadmeUrl:
      'https://github.com/sergeychernov/neuroline/blob/main/packages/neuroline-ui/README.md#storybook',
  },
  'neuroline-nextjs': {
    id: 'neuroline-nextjs',
    title: 'neuroline-nextjs',
    description: 'Next.js App Router handlers for Neuroline pipeline APIs.',
    npmUrl: 'https://www.npmjs.com/package/neuroline-nextjs',
    githubDirUrl: 'https://github.com/sergeychernov/neuroline/tree/main/packages/neuroline-nextjs',
    githubReadmeUrl:
      'https://github.com/sergeychernov/neuroline/blob/main/packages/neuroline-nextjs/README.md',
  },
  'neuroline-nestjs': {
    id: 'neuroline-nestjs',
    title: 'neuroline-nestjs',
    description: 'NestJS module and controllers for Neuroline pipeline APIs with DI.',
    npmUrl: 'https://www.npmjs.com/package/neuroline-nestjs',
    githubDirUrl: 'https://github.com/sergeychernov/neuroline/tree/main/packages/neuroline-nestjs',
    githubReadmeUrl:
      'https://github.com/sergeychernov/neuroline/blob/main/packages/neuroline-nestjs/README.md',
  },
};

