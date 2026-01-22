import React from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Link from '@docusaurus/Link';

const packages = [
	{
		id: 'neuroline',
		title: 'Core',
		description: 'Framework-agnostic pipeline orchestration.',
	},
	{
		id: 'neuroline-ui',
		title: 'UI',
		description: 'React components for pipeline visualization.',
	},
	{
		id: 'neuroline-nextjs',
		title: 'Next.js',
		description: 'App Router handlers for pipeline APIs.',
	},
	{
		id: 'neuroline-nestjs',
		title: 'NestJS',
		description: 'NestJS module and controllers for pipelines.',
	},
	{
		id: 'demo-pipelines',
		title: 'Demos',
		description: 'Sample pipeline configs used by the demo apps.',
	},
];

export default function DocsHome() {
	return (
		<Layout title="Documentation" description="Neuroline package documentation.">
			<main className="docs-home">
				<div className="container">
					<header className="docs-home-header">
						<Heading as="h1">Neuroline Documentation</Heading>
						<p>All package docs collected into a single site.</p>
					</header>
					<div className="docs-home-grid">
						{packages.map((pkg) => (
							<Link key={pkg.id} className="docs-home-card" to={`/${pkg.id}/`}>
								<Heading as="h3">{pkg.title}</Heading>
								<p>{pkg.description}</p>
							</Link>
						))}
					</div>
				</div>
			</main>
		</Layout>
	);
}
