import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import { SITE_BACKGROUND, SITE_LINKS } from '../siteConfig';

export default function ContactsPage() {
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
                Contacts
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                The fastest way to reach out is via GitHub.
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                component="a"
                href={SITE_LINKS.githubRepo}
                target="_blank"
                rel="noopener noreferrer"
                variant="contained"
              >
                GitHub Repo
              </Button>
              <Button
                component="a"
                href={SITE_LINKS.githubIssues}
                target="_blank"
                rel="noopener noreferrer"
                variant="outlined"
              >
                Issues
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

