import * as React from 'react';
import { PaletteMode } from '@mui/material';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import Drawer from '@mui/material/Drawer';
import MenuIcon from '@mui/icons-material/Menu';
import ToggleColorMode from './ToggleColorMode';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';

const logoStyle = {
  width: '140px',
  height: 'auto',
  cursor: 'pointer',
};

interface AppAppBarProps {
  mode: PaletteMode;
  toggleColorMode: () => void;
  isLoggedIn: boolean;
  onLogout: () => void;
}

function AppAppBar({ mode, toggleColorMode, isLoggedIn, onLogout }: AppAppBarProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  const handleHomeClick = () => {
    router.push('/');
  };

  const handleFindClick = () => {
    router.push('/map');
  };

  const handleBotClick = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
  
    if (token) {
      window.open(`http://localhost:3001/scrimba-langchain?idToken=${encodeURIComponent(token)}`, '_self');
    } else {
      window.open('http://localhost:3001/scrimba-langchain', '_self');
    }
  };
  

  return (
    <div>
      <AppBar
        position="fixed"
        sx={{
          boxShadow: 0,
          bgcolor: 'transparent',
          backgroundImage: 'none',
          mt: 2,
        }}
      >
        <Container maxWidth="lg">
          <Toolbar
            variant="regular"
            sx={(theme) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              borderRadius: '999px',
              bgcolor:
                theme.palette.mode === 'light'
                  ? 'rgba(255, 255, 255, 0.4)'
                  : 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(24px)',
              maxHeight: 40,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow:
                theme.palette.mode === 'light'
                  ? `0 0 1px rgba(85, 166, 246, 0.1), 1px 1.5px 2px -1px rgba(85, 166, 246, 0.15), 4px 4px 12px -2.5px rgba(85, 166, 246, 0.15)`
                  : '0 0 1px rgba(2, 31, 59, 0.7), 1px 1.5px 2px -1px rgba(2, 31, 59, 0.65), 4px 4px 12px -2.5px rgba(2, 31, 59, 0.65)',
            })}
          >
            <Box
              sx={{
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
                ml: '-18px',
                px: 0,
              }}
            >
              <img
                src={"https://zeevector.com/wp-content/uploads/Recycle-Symbol-Blue-Transparent@zeevector.com_.png"}
                style={{ width: '45px', height: '45px' }}
                alt="logo of website"
              />
              
              <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
                <MenuItem
                  onClick={handleHomeClick}
                  sx={{ py: '6px', px: '12px' }}
                >
                  <Typography variant="body2" color="text.primary">
                    Home
                  </Typography>
                </MenuItem>
              </Box>
              {isLoggedIn ? (
                <>
                  <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
                    <MenuItem
                      onClick={handleFindClick}
                      sx={{ py: '6px', px: '12px' }}
                    >
                      <Typography variant="body2" color="text.primary">
                        Find
                      </Typography>
                    </MenuItem>
                  </Box>

                  <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
                    <MenuItem
                      onClick={handleBotClick}
                      sx={{ py: '6px', px: '12px' }}
                    >
                      <Typography variant="body2" color="text.primary">
                        Chatbot
                      </Typography>
                    </MenuItem>
                  </Box>
                </>
              ) : null}
            </Box>
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                gap: 0.5,
                alignItems: 'center',
              }}
            >
              <ToggleColorMode mode={mode} toggleColorMode={toggleColorMode} />
              {isLoggedIn ? (
                <Button
                  color="primary"
                  variant="contained"
                  size="small"
                  onClick={onLogout}
                >
                 Sign Out
                </Button>
              ) : (
                <>
                  <Button
                    color="primary"
                    variant="text"
                    size="small"
                    onClick={() => router.push('/sign-in')}
                  >
                    Sign in
                  </Button>
                  <Button
                    color="primary"
                    variant="contained"
                    size="small"
                    onClick={() => router.push('/sign-up')}
                  >
                    Sign up
                  </Button>
                </>
              )}
            </Box>
            <Box sx={{ display: { sm: '', md: 'none' } }}>
              <Button
                variant="text"
                color="primary"
                aria-label="menu"
                onClick={toggleDrawer(true)}
                sx={{ minWidth: '30px', p: '4px' }}
              >
                <MenuIcon />
              </Button>
              <Drawer anchor="right" open={open} onClose={toggleDrawer(false)}>
                <Box
                  sx={{
                    minWidth: '60dvw',
                    p: 2,
                    backgroundColor: 'background.paper',
                    flexGrow: 1,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'end',
                      flexGrow: 1,
                    }}
                  >
                    <ToggleColorMode mode={mode} toggleColorMode={toggleColorMode} />
                  </Box>
                  <MenuItem onClick={handleHomeClick}>
                    Home
                  </MenuItem>
                  <Divider />
                  {isLoggedIn ? (
                    <MenuItem>
                      <Button
                        color="primary"
                        variant="contained"
                        sx={{ width: '100%' }}
                        onClick={onLogout}
                      >
                        Sign Out
                      </Button>
                    </MenuItem>
                  ) : (
                    <>
                      <MenuItem>
                        <Button
                          color="primary"
                          variant="contained"
                          onClick={() => router.push('/sign-up')}
                          sx={{ width: '100%' }}
                        >
                          Sign up
                        </Button>
                      </MenuItem>
                      <MenuItem>
                        <Button
                          color="primary"
                          variant="outlined"
                          onClick={() => router.push('/sign-in')}
                          sx={{ width: '100%' }}
                        >
                          Sign in
                        </Button>
                      </MenuItem>
                    </>
                  )}
                </Box>
              </Drawer>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
    </div>
  );
}

export default AppAppBar;
