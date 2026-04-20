"use client"
import React, { useState, useEffect } from 'react';
import { PaletteMode } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AppAppBar from './components/AppAppBar';
import FAQ from './components/FAQ';
import Highlights from './components/Highlights';
import Footer from './components/Footer';
import getLPTheme from './getLPTheme';

import { supabase } from '@/utils/supabase';

export default function LandingPage() {
  const [mode, setMode] = React.useState<PaletteMode>('light');
  const [showCustomTheme, setShowCustomTheme] = React.useState(true);
  const LPtheme = createTheme(getLPTheme(mode));
  const defaultTheme = createTheme({ palette: { mode } });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const toggleColorMode = () => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleCustomTheme = () => {
    setShowCustomTheme((prev) => !prev);
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
  };

  return (
    <ThemeProvider theme={showCustomTheme ? LPtheme : defaultTheme}>
      <CssBaseline />
      <AppAppBar
        mode="light" // or your state for theme mode
        toggleColorMode={toggleColorMode}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
      />
      <Box sx={{ bgcolor: 'background.default' }}>
        <Highlights />
        <Divider />
        <FAQ />
        <Divider />
        <Footer />     
      </Box>
    </ThemeProvider>
  );
}
