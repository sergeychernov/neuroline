const path = require('node:path');

const packages = [
	{ id: 'neuroline', label: 'Core', dir: 'neuroline' },
	{ id: 'neuroline-ui', label: 'UI', dir: 'neuroline-ui' },
	{ id: 'neuroline-nextjs', label: 'Next.js', dir: 'neuroline-nextjs' },
	{ id: 'neuroline-nestjs', label: 'NestJS', dir: 'neuroline-nestjs' },
	{ id: 'demo-pipelines', label: 'Demos', dir: 'demo-pipelines' },
];

const docsPlugins = packages.map((pkg) => [
	'@docusaurus/plugin-content-docs',
	{
		id: pkg.id,
		path: path.resolve(__dirname, `../../packages/${pkg.dir}/docs`),
		routeBasePath: pkg.id,
		sidebarPath: require.resolve('./sidebars.js'),
		editUrl: `https://github.com/sergeychernov/neuroline/edit/main/packages/${pkg.dir}/`,
		showLastUpdateAuthor: false,
		showLastUpdateTime: false,
	},
]);

const navbarItems = [
	...packages.map((pkg) => ({
		to: `/${pkg.id}/`,
		label: pkg.label,
		position: 'left',
	})),
	{
		href: 'https://github.com/sergeychernov/neuroline',
		label: 'GitHub',
		position: 'right',
	},
];

module.exports = {
	title: 'Neuroline Docs',
	url: 'https://neuroline.vercel.app',
	baseUrl: '/docs/',
	onBrokenLinks: 'throw',
	trailingSlash: true,
	markdown: {
		hooks: {
			onBrokenMarkdownLinks: 'warn',
		},
	},
	stylesheets: [
		{
			href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap',
			type: 'text/css',
		},
	],
	presets: [
		[
			'classic',
			{
				docs: false,
				blog: false,
				pages: {},
				theme: {
					customCss: require.resolve('./src/css/custom.css'),
				},
			},
		],
	],
	plugins: docsPlugins,
	themeConfig: {
		colorMode: {
			defaultMode: 'dark',
			disableSwitch: true,
			respectPrefersColorScheme: false,
		},
		navbar: {
			title: 'Neuroline Docs',
			items: navbarItems,
		},
		footer: {
			style: 'dark',
			links: [
				{
					title: 'Packages',
					items: packages.map((pkg) => ({
						label: pkg.label,
						to: `/${pkg.id}/`,
					})),
				},
				{
					title: 'Links',
					items: [
						{
							label: 'GitHub',
							href: 'https://github.com/sergeychernov/neuroline',
						},
						{
							label: 'Site',
							href: 'https://neuroline.vercel.app/',
						},
					],
				},
			],
			copyright: `Copyright © ${new Date().getFullYear()} Neuroline`,
		},
	},
};
