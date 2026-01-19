import Link from 'next/link';
import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import { SITE_BACKGROUND, SITE_LINKS } from '../siteConfig';

export default function ExamplesPage() {
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
                Examples
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                A few entry points to explore the Neuroline demo and integrations.
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button component={Link} href="/" variant="contained">
                Open Demo (Home)
              </Button>
              <Button
                component="a"
                href={`${SITE_LINKS.githubRepo}/tree/main/apps`}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
              >
                Browse Apps on GitHub
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

