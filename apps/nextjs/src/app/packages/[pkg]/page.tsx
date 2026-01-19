import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import { PACKAGES, type PackageId, SITE_BACKGROUND } from '../../siteConfig';

export function generateStaticParams() {
  return Object.keys(PACKAGES).map((pkg) => ({ pkg }));
}

export default function PackageDetailsPage({ params }: { params: { pkg: string } }) {
  const pkgId = params.pkg as PackageId;
  const pkg = PACKAGES[pkgId];

  if (!pkg) notFound();

  return (
    <Box sx={{ minHeight: '100vh', background: SITE_BACKGROUND, py: 4 }}>
      <Container maxWidth="md">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 4 },
            backgroundColor: 'rgba(19, 19, 26, 0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(124, 77, 255, 0.2)',
          }}
        >
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
                {pkg.title}
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                {pkg.description}
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button component="a" href={pkg.npmUrl} target="_blank" rel="noopener noreferrer" variant="contained">
                npm
              </Button>
              <Button
                component="a"
                href={pkg.githubDirUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
              >
                GitHub
              </Button>
              <Button
                component="a"
                href={pkg.githubReadmeUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
              >
                README
              </Button>
              {pkgId === 'neuroline-ui' ? (
                <Button component="a" href="/packages/neuroline-ui/storybook" variant="outlined">
                  Storybook
                </Button>
              ) : null}
            </Stack>

            <Box>
              <Button component={Link} href="/packages" variant="text">
                ← Back to packages
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
