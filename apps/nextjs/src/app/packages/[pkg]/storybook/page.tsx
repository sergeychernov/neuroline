import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import { PACKAGES, SITE_BACKGROUND } from '../../../siteConfig';

export default function StorybookPage({ params }: { params: { pkg: string } }) {
  if (params.pkg !== 'neuroline-ui') notFound();

  const pkg = PACKAGES['neuroline-ui'];

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
                Storybook
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                Interactive component documentation for <strong>neuroline-ui</strong>.
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Run locally:
              </Typography>
              <Typography
                variant="body1"
                component="pre"
                sx={{
                  mt: 1,
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(124, 77, 255, 0.2)',
                  overflowX: 'auto',
                }}
              >
                {`yarn storybook

# or embed into Next.js:
yarn build-storybook:nextjs
yarn dev`}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                Dev: <strong>http://localhost:6006</strong> · Embedded: <strong>/packages/neuroline-ui/storybook</strong>
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              {pkg.storybookReadmeUrl ? (
                <Button
                  component="a"
                  href={pkg.storybookReadmeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                >
                  Storybook Docs (README)
                </Button>
              ) : null}
              <Button component={Link} href="/packages/neuroline-ui" variant="outlined">
                Back to neuroline-ui
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
