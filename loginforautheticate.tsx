import { useState } from 'react';
    import {
    Container,
    Box,
    Paper,
    Typography,
    Tabs,
    Tab,
    TextField,
    Button,
    Alert,
    IconButton,
    InputAdornment,
    LinearProgress,
    Divider,
    Card,
    Grid,
    ThemeProvider,
    createTheme,
    Stack,
    } from '@mui/material';
    import {
    Visibility,
    VisibilityOff,
    Login as LoginIcon,
    PersonAdd,
    TrendingUp,
    Security,
    Speed,
    CheckCircle,
    } from '@mui/icons-material';

    // Enterprise Theme
    const theme = createTheme({
    palette: {
        primary: {
        main: '#1e3a8a',
        light: '#3b82f6',
        dark: '#0f172a',
        },
        secondary: {
        main: '#0ea5e9',
        },
        background: {
        default: '#f8fafc',
        paper: '#ffffff',
        },
        success: {
        main: '#10b981',
        },
    },
    typography: {
        fontFamily: '"Inter", "Segoe UI", sans-serif',
        h3: {
        fontWeight: 700,
        letterSpacing: '-0.5px',
        },
        h4: {
        fontWeight: 600,
        },
        body2: {
        color: '#64748b',
        },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiTextField: {
        styleOverrides: {
            root: {
            '& .MuiOutlinedInput-root': {
                fontSize: '0.95rem',
                transition: 'all 0.3s ease',
                '&:hover': {
                backgroundColor: '#f8fafc',
                },
            },
            },
        },
        },
        MuiButton: {
        styleOverrides: {
            containedPrimary: {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(30, 58, 138, 0.15)',
            '&:hover': {
                boxShadow: '0 8px 24px rgba(30, 58, 138, 0.25)',
                transform: 'translateY(-2px)',
            },
            '&:disabled': {
                boxShadow: 'none',
            },
            },
        },
        },
    },
    });

    export default function EnterpriseLoginPage() {
    const [tab, setTab] = useState(0);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const API_BASE = 'http://localhost:8000/api';

    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!email || !password) {
        setError('Please fill in all fields');
        return;
        }

        if (!validateEmail(email)) {
        setError('Please enter a valid email');
        return;
        }

        setLoading(true);
        try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            setSuccess('Login successful! Redirecting...');
            localStorage.setItem('token', data.token);
            localStorage.setItem('user_id', data.user_id);
            localStorage.setItem('email', data.email);
            setTimeout(() => {
            window.location.href = '/home';
            }, 1500);
        } else {
            setError(data.detail || data.message || 'Invalid credentials');
        }
        } catch (err) {
        setError('Connection error. Please check if backend is running.');
        } finally {
        setLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!email || !password || !confirmPassword) {
        setError('Please fill in all fields');
        return;
        }

        if (!validateEmail(email)) {
        setError('Please enter a valid email');
        return;
        }

        if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
        }

        if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
        }

        setLoading(true);
        try {
        const response = await fetch(`${API_BASE}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            setSuccess('Account created successfully! You can now login.');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setTimeout(() => {
            setTab(0);
            }, 1500);
        } else {
            setError(data.detail || data.message || 'Signup failed');
        }
        } catch (err) {
        setError('Connection error. Please check if backend is running.');
        } finally {
        setLoading(false);
        }
    };

    return (
        <ThemeProvider theme={theme}>
        <Box
            sx={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: 4,
            }}
        >
            <Container maxWidth={false} disableGutters sx={{ width: '100vw', height: '100vh', m: 0, p: 0 }}>
            <Grid container spacing={0} alignItems="stretch" sx={{ minHeight: '100vh' }}>
                {/* Left Section - Features */}
                <Grid item xs={12} md={6} sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0 }}>
                <Box sx={{ color: 'white', pl: { xs: 0, md: 4 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <TrendingUp sx={{ fontSize: 40 }} />
                    <Typography variant="h3" sx={{ color: 'white', m: 0 }}>
                        Market Planner
                    </Typography>
                    </Box>
                    <Typography variant="h6" sx={{ mb: 4, color: '#cbd5e1', fontWeight: 300 }}>
                    Enterprise-grade market forecasting and trend analysis platform
                    </Typography>

                    <Stack spacing={3}>
                    {[
                        {
                        icon: <TrendingUp />,
                        title: 'Real-Time Analytics',
                        desc: 'Track market trends with live data visualization',
                        },
                        {
                        icon: <Security />,
                        title: 'Enterprise Security',
                        desc: 'Bank-level encryption and secure authentication',
                        },
                        {
                        icon: <Speed />,
                        title: 'Lightning Fast',
                        desc: 'Optimized performance for large datasets',
                        },
                    ].map((feature, idx) => (
                        <Box key={idx} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                        <Box
                            sx={{
                            mt: 0.5,
                            color: '#0ea5e9',
                            display: 'flex',
                            }}
                        >
                            <CheckCircle sx={{ fontSize: 24 }} />
                        </Box>
                        <Box>
                            <Typography
                            sx={{
                                color: 'white',
                                fontWeight: 600,
                                mb: 0.5,
                            }}
                            >
                            {feature.title}
                            </Typography>
                            <Typography sx={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                            {feature.desc}
                            </Typography>
                        </Box>
                        </Box>
                    ))}
                    </Stack>

                    <Box
                    sx={{
                        mt: 6,
                        p: 2.5,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 2,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        mb: { xs: 4, md: 0 }, // Add margin bottom for spacing on mobile
                        mr: { xs: 0, md: 6 }, // Add margin right for spacing on desktop
                    }}
                    >
                    <Typography sx={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                        Trusted by 500+ companies worldwide for accurate market predictions
                    </Typography>
                    </Box>
                </Box>
                </Grid>

                {/* Right Section - Login Form */}
                <Grid item xs={12} md={6} sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', p: 0, pl: { xs: 0, md: 6 } }}>
                <Paper
                    elevation={0}
                    sx={{
                    p: 4,
                    borderRadius: 3,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
                    }}
                >
                    {/* Header */}
                    <Box sx={{ mb: 4 }}>
                    <Typography
                        variant="h4"
                        sx={{
                        color: '#1e3a8a',
                        mb: 1,
                        fontWeight: 700,
                        }}
                    >
                        {tab === 0 ? 'Welcome Back' : 'Create Account'}
                    </Typography>
                    <Typography variant="body2">
                        {tab === 0
                        ? 'Sign in to access your forecasting dashboard'
                        : 'Join our platform to start planning'}
                    </Typography>
                    </Box>

                    {/* Tabs */}
                    <Box
                    sx={{
                        mb: 3,
                        display: 'flex',
                        gap: 1,
                    }}
                    >
                    <Button
                        onClick={() => {
                        setTab(0);
                        setError('');
                        setSuccess('');
                        }}
                        sx={{
                        flex: 1,
                        py: 1.5,
                        backgroundColor: tab === 0 ? '#1e3a8a' : '#f1f5f9',
                        color: tab === 0 ? 'white' : '#64748b',
                        fontWeight: 600,
                        textTransform: 'none',
                        fontSize: '0.95rem',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            backgroundColor: tab === 0 ? '#1e3a8a' : '#e2e8f0',
                        },
                        }}
                        startIcon={<LoginIcon />}
                    >
                        Login
                    </Button>
                    <Button
                        onClick={() => {
                        setTab(1);
                        setError('');
                        setSuccess('');
                        }}
                        sx={{
                        flex: 1,
                        py: 1.5,
                        backgroundColor: tab === 1 ? '#1e3a8a' : '#f1f5f9',
                        color: tab === 1 ? 'white' : '#64748b',
                        fontWeight: 600,
                        textTransform: 'none',
                        fontSize: '0.95rem',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            backgroundColor: tab === 1 ? '#1e3a8a' : '#e2e8f0',
                        },
                        }}
                        startIcon={<PersonAdd />}
                    >
                        Sign Up
                    </Button>
                    </Box>

                    <Divider sx={{ mb: 3 }} />

                    {/* Messages */}
                    {error && (
                    <Alert
                        severity="error"
                        sx={{
                        mb: 2,
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #fecaca',
                        }}
                    >
                        {error}
                    </Alert>
                    )}

                    {success && (
                    <Alert
                        severity="success"
                        sx={{
                        mb: 2,
                        backgroundColor: '#dcfce7',
                        color: '#166534',
                        border: '1px solid #bbf7d0',
                        }}
                    >
                        {success}
                    </Alert>
                    )}

                    {loading && <LinearProgress sx={{ mb: 2 }} />}

                    {/* Form */}
                    <Box
                    component="form"
                    onSubmit={tab === 0 ? handleLogin : handleSignup}
                    sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
                    >
                    <TextField
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        fullWidth
                        placeholder="you@company.com"
                        variant="outlined"
                        size="medium"
                        required
                        disabled={loading}
                    />

                    <TextField
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        fullWidth
                        placeholder="Enter your password"
                        variant="outlined"
                        size="medium"
                        required
                        disabled={loading}
                        InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                            <IconButton
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                                disabled={loading}
                            >
                                {showPassword ? (
                                <VisibilityOff sx={{ color: '#64748b' }} />
                                ) : (
                                <Visibility sx={{ color: '#64748b' }} />
                                )}
                            </IconButton>
                            </InputAdornment>
                        ),
                        }}
                    />

                    {tab === 1 && (
                        <TextField
                        label="Confirm Password"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        fullWidth
                        placeholder="Confirm your password"
                        variant="outlined"
                        size="medium"
                        required
                        disabled={loading}
                        />
                    )}

                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        fullWidth
                        sx={{
                        mt: 2,
                        py: 1.75,
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        }}
                        disabled={loading}
                        startIcon={tab === 0 ? <LoginIcon /> : <PersonAdd />}
                    >
                        {loading ? 'Processing...' : tab === 0 ? 'Sign In' : 'Create Account'}
                    </Button>
                    </Box>

                    {/* Footer */}
                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Typography variant="body2">
                        {tab === 0 ? "Don't have an account? " : 'Already have an account? '}
                        <Button
                        color="primary"
                        variant="text"
                        onClick={() => {
                            setTab(tab === 0 ? 1 : 0);
                            setError('');
                            setSuccess('');
                        }}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            p: 0,
                            ml: 0.5,
                        }}
                        >
                        {tab === 0 ? 'Sign up' : 'Sign in'}
                        </Button>
                    </Typography>
                    </Box>

                    {/* Security Note */}
                    <Box
                    sx={{
                        mt: 3,
                        p: 2,
                        backgroundColor: '#f8fafc',
                        borderRadius: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                    }}
                    >
                    <Security sx={{ color: '#10b981', fontSize: 20 }} />
                    <Typography variant="caption" sx={{ color: '#475569' }}>
                        Your password is encrypted with enterprise-grade security
                    </Typography>
                    </Box>
                </Paper>
                </Grid>
            </Grid>
            </Container>
        </Box>
        </ThemeProvider>
    );
    }
