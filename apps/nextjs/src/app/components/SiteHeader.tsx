'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AppBar,
  Box,
  Button,
  Collapse,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

type NavItem = { label: string; href: string; external?: boolean };

const drawerWidth = 320;

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [packagesOpen, setPackagesOpen] = useState(false);
  const [packagesMenuAnchor, setPackagesMenuAnchor] = useState<null | HTMLElement>(null);

  const primaryItems = useMemo<NavItem[]>(
    () => [
      { label: 'GitHub', href: 'https://github.com/sergeychernov/neuroline', external: true },
      { label: 'npmjs', href: 'https://www.npmjs.com/search?q=neuroline', external: true },
      { label: 'Examples', href: '/examples' },
      { label: 'Contacts', href: '/contacts' },
      { label: 'Documentation', href: '/docs' },
    ],
    [],
  );

  const packageItems = useMemo(
    () => [
      { label: 'neuroline', href: '/packages/neuroline' },
      { label: 'neuroline-ui', href: '/packages/neuroline-ui' },
      { label: 'Storybook', href: '/packages/neuroline-ui/storybook', indent: 2 },
      { label: 'neuroline-nextjs', href: '/packages/neuroline-nextjs' },
      { label: 'neuroline-nestjs', href: '/packages/neuroline-nestjs' },
    ],
    [],
  );

  const closeMobileDrawer = () => setMobileOpen(false);

  const openPackagesMenu = Boolean(packagesMenuAnchor);
  const handleOpenPackagesMenu = (event: React.MouseEvent<HTMLElement>) =>
    setPackagesMenuAnchor(event.currentTarget);
  const handleClosePackagesMenu = () => setPackagesMenuAnchor(null);

  const desktopButtonSx = (href: string) => ({
    textTransform: 'none',
    fontWeight: 600,
    opacity: isActivePath(pathname, href) ? 1 : 0.8,
    '&:hover': { opacity: 1 },
    ...(isActivePath(pathname, href) && {
      borderBottom: '2px solid',
      borderColor: 'rgba(0, 229, 255, 0.8)',
    }),
  });

  const drawer = (
    <Box sx={{ width: drawerWidth }} role="presentation">
      <Box sx={{ px: 2, py: 2 }}>
        <Typography
          variant="h6"
          component={Link}
          href="/"
          onClick={closeMobileDrawer}
          sx={{
            fontWeight: 800,
            letterSpacing: '0.06em',
            textDecoration: 'none',
            color: 'inherit',
            display: 'inline-block',
          }}
        >
          NEUROLINE
        </Typography>
      </Box>
      <Divider />
      <List>
        {primaryItems.slice(0, 4).map((item) => (
          <ListItemButton
            key={item.label}
            component={item.external ? 'a' : Link}
            href={item.href}
            target={item.external ? '_blank' : undefined}
            rel={item.external ? 'noopener noreferrer' : undefined}
            onClick={closeMobileDrawer}
            selected={!item.external && isActivePath(pathname, item.href)}
          >
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}

        <ListItemButton onClick={() => setPackagesOpen((v) => !v)}>
          <ListItemText primary="Packages" />
          {packagesOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </ListItemButton>
        <Collapse in={packagesOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {packageItems.map((item) => (
              <ListItemButton
                key={item.href}
                component={Link}
                href={item.href}
                onClick={closeMobileDrawer}
                selected={isActivePath(pathname, item.href)}
                sx={{ pl: item.indent ? 6 : 4 }}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Collapse>

        {primaryItems.slice(4).map((item) => (
          <ListItemButton
            key={item.label}
            component={item.external ? 'a' : Link}
            href={item.href}
            target={item.external ? '_blank' : undefined}
            rel={item.external ? 'noopener noreferrer' : undefined}
            onClick={closeMobileDrawer}
            selected={!item.external && isActivePath(pathname, item.href)}
          >
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: 'rgba(10, 10, 18, 0.72)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(124, 77, 255, 0.2)',
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <IconButton
            color="inherit"
            aria-label="open navigation"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 1, display: { xs: 'inline-flex', md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography
            variant="h6"
            component={Link}
            href="/"
            sx={{
              mr: 2,
              fontWeight: 900,
              letterSpacing: '0.1em',
              textDecoration: 'none',
              color: 'inherit',
              flexGrow: { xs: 1, md: 0 },
            }}
          >
            NEUROLINE
          </Typography>

          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'block' } }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button
                component="a"
                href="https://github.com/sergeychernov/neuroline"
                target="_blank"
                rel="noopener noreferrer"
                color="inherit"
                sx={desktopButtonSx('__external_github')}
              >
                GitHub
              </Button>
              <Button
                component="a"
                href="https://www.npmjs.com/search?q=neuroline"
                target="_blank"
                rel="noopener noreferrer"
                color="inherit"
                sx={desktopButtonSx('__external_npmjs')}
              >
                npmjs
              </Button>
              <Button component={Link} href="/examples" color="inherit" sx={desktopButtonSx('/examples')}>
                Examples
              </Button>
              <Button component={Link} href="/contacts" color="inherit" sx={desktopButtonSx('/contacts')}>
                Contacts
              </Button>

              <Button
                color="inherit"
                onClick={handleOpenPackagesMenu}
                endIcon={<KeyboardArrowDownIcon />}
                sx={desktopButtonSx('/packages')}
              >
                Packages
              </Button>
              <Menu
                anchorEl={packagesMenuAnchor}
                open={openPackagesMenu}
                onClose={handleClosePackagesMenu}
                MenuListProps={{ 'aria-label': 'packages menu' }}
                PaperProps={{
                  sx: {
                    mt: 1,
                    backgroundColor: 'rgba(19, 19, 26, 0.9)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(124, 77, 255, 0.2)',
                  },
                }}
              >
                {packageItems.map((item) => (
                  <MenuItem
                    key={item.href}
                    component={Link}
                    href={item.href}
                    onClick={handleClosePackagesMenu}
                    sx={{ pl: item.indent ? 4 : 2 }}
                  >
                    {item.label}
                  </MenuItem>
                ))}
              </Menu>

              <Button component={Link} href="/docs" color="inherit" sx={desktopButtonSx('/docs')}>
                Documentation
              </Button>
            </Stack>
          </Box>

          <Drawer
            anchor="left"
            open={mobileOpen}
            onClose={closeMobileDrawer}
            ModalProps={{ keepMounted: true }}
            PaperProps={{
              sx: {
                backgroundColor: 'rgba(10, 10, 18, 0.92)',
                backdropFilter: 'blur(16px)',
                borderRight: '1px solid rgba(124, 77, 255, 0.2)',
              },
            }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
            }}
          >
            {drawer}
          </Drawer>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
