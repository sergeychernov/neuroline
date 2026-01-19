import Link from 'next/link';
import { Box, Button, Container, Divider, Paper, Stack, Typography } from '@mui/material';
import { PACKAGES, SITE_BACKGROUND } from '../siteConfig';

export default function PackagesPage() {
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
          <Stack spacing={3}>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
                Packages
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                Core library, UI components, and framework integrations.
              </Typography>
            </Box>

            <Stack spacing={2}>
              {Object.values(PACKAGES).map((pkg) => (
                <Box key={pkg.id}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {pkg.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {pkg.description}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button component={Link} href={`/packages/${pkg.id}`} variant="contained" size="small">
                        Details
                      </Button>
                      <Button
                        component="a"
                        href={pkg.npmUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="outlined"
                        size="small"
                      >
                        npm
                      </Button>
                    </Stack>
                  </Stack>
                  <Divider sx={{ mt: 2, borderColor: 'rgba(160, 160, 160, 0.2)' }} />
                </Box>
              ))}
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

