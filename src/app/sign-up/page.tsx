"use client"
import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'next/navigation';

function Copyright(props: any) {
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {'Copyright © '}
      <Link color="inherit" href="/">
        EcoFind
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

const defaultTheme = createTheme();

export default function SignUp() {
  const [userType, setUserType] = React.useState('consumer');
  const [longitude, setLongitude] = React.useState('');
  const [latitude, setLatitude] = React.useState('');
  const [trashTypes, setTrashTypes] = React.useState<string[]>([]);
  const [companyName, setCompanyName] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();

  const handleUserTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserType((event.target as HTMLInputElement).value);
  };

  const handleTrashTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setTrashTypes(prevState =>
      prevState.includes(value)
        ? prevState.filter(type => type !== value)
        : [...prevState, value]
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);

    const email = data.get('email') as string;
    const password = data.get('password') as string;

    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Insert profile data
        const profileData: any = {
          id: authData.user.id,
          user_type: userType,
          email: email,
        };

        if (userType === 'consumer') {
          profileData.longitude = parseFloat(longitude);
          profileData.latitude = parseFloat(latitude);
          profileData.trash_types = trashTypes;
          profileData.company_name = companyName;
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([profileData]);

        if (profileError) throw profileError;

        console.log('Sign-up successful!');
        router.push("/");
      }
    } catch (error: any) {
      console.error('Error during sign-up:', error);
      setError(error.message || 'Failed to sign up');
    }
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Sign up
          </Typography>
          <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  id="password"
                  autoComplete="new-password"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.primary">
                  I am a:
                </Typography>
                <RadioGroup
                  name="userType"
                  value={userType}
                  onChange={handleUserTypeChange}
                  row
                >
                  <FormControlLabel
                    value="consumer"
                    control={<Radio />}
                    label="Consumer"
                  />
                  <FormControlLabel
                    value="producer"
                    control={<Radio />}
                    label="Producer"
                  />
                </RadioGroup>
              </Grid>
              {userType === 'consumer' && (
                <>
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      name="longitude"
                      label="Longitude"
                      type="number"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      name="latitude"
                      label="Latitude"
                      type="number"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.primary">
                      Trash Types:
                    </Typography>
                    <FormControlLabel
                      control={<Checkbox value="TPU" onChange={handleTrashTypeChange} />}
                      label="TPU"
                    />
                    <FormControlLabel
                      control={<Checkbox value="PLA" onChange={handleTrashTypeChange} />}
                      label="PLA"
                    />
                    <FormControlLabel
                      control={<Checkbox value="PETG" onChange={handleTrashTypeChange} />}
                      label="PETG"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      name="companyName"
                      label="Company Name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </Grid>
                </>
              )}
            </Grid>
            {error && (
              <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Sign Up
            </Button>
            <Grid container justifyContent="flex-end">
              <Grid item>
                <Link href="/sign-in" variant="body2">
                  Already have an account? Sign in
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Box>
        <Copyright sx={{ mt: 5 }} />
      </Container>
    </ThemeProvider>
  );
}
