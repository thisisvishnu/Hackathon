import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  AppBar,
  Toolbar,
  Avatar,
  Menu,
  MenuItem,
  ThemeProvider,
  createTheme,
  Divider,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  Settings,
  Logout,
  CloudUpload,
  Download,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

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
      default: '#0f1226',
      paper: 'rgba(255,255,255,0.04)',
    },
    success: {
      main: '#10b981',
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
  },
});

interface PredictionResult {
  date: string;
  storeId: string;
  productId: string;
  actual: number;
  predicted: number;
  error: number;
}

interface DashboardMetrics {
  mape: number;
  totalPredictions: number;
  accuracy: number;
  totalRows: number;
  totalStores: number;
  totalProducts: number;
}

export default function RetailForecastDashboard() {
  const [user, setUser] = useState<{ email: string; user_id: string } | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [productErrorData, setProductErrorData] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('email');
    const user_id = localStorage.getItem('user_id');

    if (!token) {
      window.location.href = '/';
      return;
    }

    setUser({ email: email || 'User', user_id: user_id || '' });
  }, []);

  const processChartData = (data: PredictionResult[]) => {
    const dateAgg: Record<string, { actual: number; predicted: number }> = {};
    data.forEach((item) => {
      if (!dateAgg[item.date]) {
        dateAgg[item.date] = { actual: 0, predicted: 0 };
      }
      dateAgg[item.date].actual += item.actual;
      dateAgg[item.date].predicted += item.predicted;
    });

    const chartData = Object.entries(dateAgg).map(([date, values]) => ({
      date,
      Actual: values.actual,
      Predicted: values.predicted,
    }));
    setChartData(chartData);

    const productErrors: Record<string, number[]> = {};
    data.forEach((item) => {
      if (!productErrors[item.productId]) {
        productErrors[item.productId] = [];
      }
      productErrors[item.productId].push(item.error);
    });

    const productErrorData = Object.entries(productErrors)
      .map(([productId, errors]) => ({
        productId,
        meanError: errors.reduce((a, b) => a + b, 0) / errors.length,
      }))
      .sort((a, b) => b.meanError - a.meanError)
      .slice(0, 20);

    setProductErrorData(productErrorData);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setUploadProgress((e.loaded / e.total) * 100);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          setPredictions(data.predictions);
          setMetrics(data.metrics);
          processChartData(data.predictions);
          setUploadProgress(0);
        } else {
          setError('Upload failed. Please check the file format.');
        }
        setLoading(false);
      });

      xhr.addEventListener('error', () => {
        setError('Connection error during upload');
        setLoading(false);
      });

      xhr.open('POST', 'http://localhost:8001/api/upload-forecast');
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
      xhr.send(formData);
    } catch (err) {
      setError('Upload error');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('user_id');
    window.location.href = '/';
  };

  const downloadPredictions = () => {
    if (!predictions.length) return;

    const csv = [
      ['Date', 'Store ID', 'Product ID', 'Actual Demand', 'Predicted Demand', 'Error %'],
      ...predictions.map((p) => [p.date, p.storeId, p.productId, p.actual, p.predicted, p.error.toFixed(2)]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'predictions.csv';
    a.click();
  };

  const StatCard = ({ label, value, color }: { label: string; value: string | number; color: string }) => (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: '16px',
        background: `linear-gradient(135deg, ${color}15, ${color}08)`,
        border: `1px solid ${color}30`,
        backdropFilter: 'blur(14px)',
        textAlign: 'center',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 12px 24px ${color}40`,
        },
      }}
    >
      <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600, mb: 1 }}>
        {label}
      </Typography>
      <Typography sx={{ color: '#ffffff', fontSize: '1.8rem', fontWeight: 700, textShadow: `0 2px 8px ${color}40` }}>
        {value}
      </Typography>
    </Paper>
  );

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          background: `radial-gradient(1200px 500px at 15% 15%, rgba(30,144,255,0.14), transparent 15%),
                       radial-gradient(1000px 400px at 80% 80%, rgba(142,68,173,0.12), transparent 15%),
                       radial-gradient(600px 600px at 40% 70%, rgba(44,230,183,0.08), transparent 20%),
                       linear-gradient(180deg, #0f1226 0%, #071028 100%)`,
          minHeight: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          color: '#e9eef8',
          overflow: 'hidden',
        }}
      >
        {/* AppBar */}
        <AppBar
          position="static"
          sx={{
            backgroundColor: 'rgba(15,18,38,0.8)',
            backdropFilter: 'blur(14px)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            color: '#e9eef8',
          }}
        >
          <Toolbar>
            <TrendingUp sx={{ fontSize: 28, mr: 1, color: '#3b82f6' }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffffff', flex: 1 }}>
              Retail Demand Forecasting Dashboard
            </Typography>

            <Avatar
              sx={{
                bgcolor: '#3b82f6',
                cursor: 'pointer',
                fontWeight: 700,
              }}
              onClick={(e) => setAnchorEl(e.currentTarget)}
            >
              {user?.email?.[0].toUpperCase()}
            </Avatar>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem disabled>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {user?.email}
                </Typography>
              </MenuItem>
              <Divider />
              <MenuItem>
                <Settings sx={{ mr: 1, fontSize: 20 }} />
                Settings
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <Logout sx={{ mr: 1, fontSize: 20, color: '#ef4444' }} />
                <Typography sx={{ color: '#ef4444' }}>Logout</Typography>
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Main Content - FULLSCREEN */}
        <Box sx={{ py: 3, px: 3, flex: 1, overflow: 'auto', maxWidth: '800px', width: '100%', margin: '0 auto' }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* Upload Section */}
          <Paper
            sx={{
              p: 3,
              mb: 4,
              borderRadius: '18px',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(14px)',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
                borderColor: 'rgba(255,255,255,0.2)',
              },
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <CloudUpload sx={{ fontSize: 40, color: '#3b82f6', mb: 1 }} />
            <Typography sx={{ color: '#e9eef8', fontWeight: 600, mb: 0.5 }}>
              Click to upload CSV file
            </Typography>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              Required columns: Date, Store ID, Product ID, Demand Forecast
            </Typography>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <Box sx={{ mt: 2 }}>
                <CircularProgress variant="determinate" value={uploadProgress} />
                <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem', mt: 1 }}>
                  {uploadProgress.toFixed(0)}%
                </Typography>
              </Box>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={loading}
            />
          </Paper>

          {/* Metrics */}
          {metrics && (
            <>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: '#ffffff' }}>
                🎯 Results
              </Typography>
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard label="MAPE" value={`${metrics.mape.toFixed(2)}%`} color="#ef4444" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard label="Predictions" value={metrics.totalPredictions.toLocaleString()} color="#3b82f6" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard label="Accuracy" value={`${(100 - metrics.mape).toFixed(1)}%`} color="#10b981" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard label="Stores" value={metrics.totalStores} color="#f59e0b" />
                </Grid>
              </Grid>
            </>
          )}

          {/* Charts */}
          {chartData.length > 0 && (
            <>
              <Paper
                sx={{
                  p: 3,
                  mb: 4,
                  borderRadius: '18px',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(14px)',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#ffffff' }}>
                  📊 Actual vs Predicted Demand
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15,18,38,0.9)',
                        border: '1px solid rgba(255,255,255,0.2)',
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="Actual" stroke="#00d9ff" strokeWidth={2} />
                    <Line type="monotone" dataKey="Predicted" stroke="#ff00ff" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>

              <Paper
                sx={{
                  p: 3,
                  mb: 4,
                  borderRadius: '18px',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(14px)',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#ffffff' }}>
                  📈 Product-wise Error (Top 20)
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productErrorData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="productId" stroke="#94a3b8" angle={-45} textAnchor="end" height={100} />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15,18,38,0.9)',
                        border: '1px solid rgba(255,255,255,0.2)',
                      }}
                    />
                    <Bar dataKey="meanError" fill="#ff9900" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>

              {/* Results Table */}
              <Paper
                sx={{
                  borderRadius: '18px',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(14px)',
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#ffffff' }}>
                    📋 Detailed Results (First 50 rows)
                  </Typography>
                  <Button
                    startIcon={<Download />}
                    variant="contained"
                    onClick={downloadPredictions}
                    sx={{
                      background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                      textTransform: 'none',
                    }}
                  >
                    Download CSV
                  </Button>
                </Box>
                <TableContainer sx={{ maxHeight: '500px' }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: '#94a3b8', fontWeight: 600, bgcolor: 'rgba(15,18,38,0.95)' }}>Date</TableCell>
                        <TableCell sx={{ color: '#94a3b8', fontWeight: 600, bgcolor: 'rgba(15,18,38,0.95)' }}>Store ID</TableCell>
                        <TableCell sx={{ color: '#94a3b8', fontWeight: 600, bgcolor: 'rgba(15,18,38,0.95)' }}>Product ID</TableCell>
                        <TableCell sx={{ color: '#94a3b8', fontWeight: 600, bgcolor: 'rgba(15,18,38,0.95)' }} align="right">
                          Actual
                        </TableCell>
                        <TableCell sx={{ color: '#94a3b8', fontWeight: 600, bgcolor: 'rgba(15,18,38,0.95)' }} align="right">
                          Predicted
                        </TableCell>
                        <TableCell sx={{ color: '#94a3b8', fontWeight: 600, bgcolor: 'rgba(15,18,38,0.95)' }} align="right">
                          Error %
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {predictions.slice(0, 50).map((row, idx) => (
                        <TableRow key={idx} sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <TableCell sx={{ color: '#e9eef8' }}>{row.date}</TableCell>
                          <TableCell sx={{ color: '#e9eef8' }}>{row.storeId}</TableCell>
                          <TableCell sx={{ color: '#e9eef8' }}>{row.productId}</TableCell>
                          <TableCell sx={{ color: '#e9eef8' }} align="right">
                            {row.actual.toFixed(2)}
                          </TableCell>
                          <TableCell sx={{ color: '#e9eef8' }} align="right">
                            {row.predicted.toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${row.error.toFixed(2)}%`}
                              size="small"
                              sx={{
                                backgroundColor: row.error > 10 ? '#ef444440' : '#10b98140',
                                color: row.error > 10 ? '#ff9999' : '#10b981',
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          )}

          {!metrics && !loading && (
            <Paper
              sx={{
                p: 6,
                textAlign: 'center',
                borderRadius: '18px',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(14px)',
              }}
            >
              <CloudUpload sx={{ fontSize: 60, color: '#3b82f6', mb: 2 }} />
              <Typography sx={{ color: '#e9eef8', fontSize: '1.2rem', fontWeight: 600, mb: 1 }}>
                No data yet
              </Typography>
              <Typography sx={{ color: '#94a3b8' }}>Upload a CSV file to see predictions and analytics</Typography>
            </Paper>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
