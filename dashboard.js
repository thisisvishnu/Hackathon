import React, { useState, useMemo } from 'react';
import ChatBot from './chatbot';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  CloudUpload,
  TrendingUp,
  Warning,
  Inventory,
  Assessment,
  SmartToy as BotIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ScatterChart,
  Scatter
} from 'recharts';

const CPGDashboard = ({ onLogout, onNavigateToChatBot }) => {
  const [csvData, setCsvData] = useState(null);
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      // Create FormData to send file to backend
      const formData = new FormData();
      formData.append('file', file);

      // Send to backend
      const response = await fetch('http://localhost:8001/api/process-csv', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process CSV');
      }

      // Get the processed CSV from backend
      const processedCsvText = await response.text();

      // Parse the processed CSV
      const lines = processedCsvText.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const data = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, idx) => {
          obj[header] = values[idx]?.trim() || '';
        });
        return obj;
      });
      
      setCsvData(data);
    } catch (error) {
      console.error('Error processing CSV:', error);
      setError('Failed to process CSV. Please check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Filter data
  const filteredData = useMemo(() => {
    if (!csvData) return [];
    return csvData.filter(item => {
      if (selectedStore !== 'all' && item.StoreName !== selectedStore) return false;
      if (selectedCategory !== 'all' && item.Category !== selectedCategory) return false;
      return true;
    });
  }, [csvData, selectedStore, selectedCategory]);

  // Get unique stores and categories
  const stores = useMemo(() => {
    if (!csvData) return [];
    return [...new Set(csvData.map(item => item.StoreName))].filter(Boolean);
  }, [csvData]);

  const categories = useMemo(() => {
    if (!csvData) return [];
    return [...new Set(csvData.map(item => item.Category))].filter(Boolean);
  }, [csvData]);

  // Calculate KPI metrics
  const metrics = useMemo(() => {
    if (!filteredData.length) return null;
    
    const totalForecast = filteredData.reduce((sum, item) => sum + (Number(item.ForecastSales) || 0), 0);
    const totalActual = filteredData.reduce((sum, item) => sum + (Number(item.ActualSales) || 0), 0);
    const errors = filteredData.map(item => Math.abs(Number(item.ForecastError) || 0)).filter(e => !isNaN(e));
    const avgError = errors.length > 0 ? errors.reduce((a, b) => a + b, 0) / errors.length : 0;
    const lowStock = filteredData.filter(item => 
      Number(item.ClosingStock) < Number(item.ReorderLevel)
    ).length;
    
    return {
      totalForecast: Math.floor(totalForecast),
      totalActual: Math.floor(totalActual),
      accuracy: (100 - avgError).toFixed(1),
      lowStockItems: lowStock,
      variance: ((totalActual - totalForecast) / totalForecast * 100).toFixed(1)
    };
  }, [filteredData]);

  // Monthly trends for forecasting
  const monthlyTrends = useMemo(() => {
    if (!filteredData.length) return [];
    
    const grouped = {};
    filteredData.forEach(item => {
      const date = item.Date || item.month_number;
      const key = date.substring ? date.substring(0, 7) : `Month ${date}`;
      
      if (!grouped[key]) {
        grouped[key] = { month: key, forecast: 0, actual: 0, sold: 0 };
      }
      grouped[key].forecast += Number(item.ForecastSales) || 0;
      grouped[key].actual += Number(item.ActualSales) || 0;
      grouped[key].sold += Number(item.SoldQty) || 0;
    });
    
    return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredData]);

  // Category performance
  const categoryPerformance = useMemo(() => {
    if (!filteredData.length) return [];
    
    const grouped = {};
    filteredData.forEach(item => {
      const cat = item.Category;
      if (!grouped[cat]) {
        grouped[cat] = { 
          name: cat, 
          value: 0, 
          forecast: 0, 
          error: 0, 
          count: 0 
        };
      }
      grouped[cat].value += Number(item.ActualSales) || 0;
      grouped[cat].forecast += Number(item.ForecastSales) || 0;
      grouped[cat].error += Math.abs(Number(item.ForecastError) || 0);
      grouped[cat].count += 1;
    });
    
    return Object.values(grouped).map(g => ({
      ...g,
      avgError: g.count > 0 ? (g.error / g.count).toFixed(1) : 0
    }));
  }, [filteredData]);

  // Store comparison
  const storeComparison = useMemo(() => {
    if (!filteredData.length) return [];
    
    const grouped = {};
    filteredData.forEach(item => {
      const store = item.StoreName;
      if (!grouped[store]) {
        grouped[store] = { store, sales: 0, forecast: 0 };
      }
      grouped[store].sales += Number(item.ActualSales) || 0;
      grouped[store].forecast += Number(item.ForecastSales) || 0;
    });
    
    return Object.values(grouped);
  }, [filteredData]);

  // Forecast accuracy scatter
  const forecastAccuracyData = useMemo(() => {
    if (!filteredData.length) return [];
    
    return filteredData.slice(0, 100).map(item => ({
      forecast: Number(item.ForecastSales) || 0,
      actual: Number(item.ActualSales) || 0,
      product: item.ProductName
    })).filter(d => d.forecast > 0 && d.actual > 0);
  }, [filteredData]);

  // Stock levels analysis
  const stockAnalysis = useMemo(() => {
    if (!filteredData.length) return [];
    
    const grouped = {};
    filteredData.forEach(item => {
      const date = item.Date || `Month ${item.month_number}`;
      const key = date.substring ? date.substring(0, 7) : date;
      
      if (!grouped[key]) {
        grouped[key] = { month: key, opening: 0, closing: 0, received: 0, sold: 0 };
      }
      grouped[key].opening += Number(item.OpeningStock) || 0;
      grouped[key].closing += Number(item.ClosingStock) || 0;
      grouped[key].received += Number(item.ReceivedQty) || 0;
      grouped[key].sold += Number(item.SoldQty) || 0;
    });
    
    return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredData]);

  // Low stock alerts
  const lowStockAlerts = useMemo(() => {
    if (!filteredData.length) return [];
    
    return filteredData
      .filter(item => Number(item.ClosingStock) < Number(item.ReorderLevel))
      .slice(0, 15)
      .map(item => ({
        ...item,
        deficit: Number(item.ReorderLevel) - Number(item.ClosingStock)
      }));
  }, [filteredData]);

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];

  return (
    <Box sx={{ 
      background: 'rgba(18, 37, 58, 0.87)',
      minHeight: '100vh', 
      pb: 4 
    }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.95)', borderBottom: '1px solid rgba(255,255,255,0.2)', mb: 3, backdropFilter: 'blur(10px)' }}>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Assessment sx={{ fontSize: 48, color: '#667eea' }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  CPG Demand Forecasting
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Analyze and predict inventory demand patterns
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUpload />}
              size="large"
              disabled={loading}
              sx={{ 
                px: 4,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
                }
              }}
            >
              {loading ? 'Processing...' : 'Upload CSV Data'}
              <input type="file" hidden accept=".csv" onChange={handleFileUpload} disabled={loading} />
            </Button>
          </Box>
        </Container>
      </Box>

      {loading ? (
        <Container maxWidth="md" sx={{ mt: 10, textAlign: 'center' }}>
          <Paper elevation={3} sx={{ p: 8, borderRadius: 3, bgcolor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
            <CircularProgress size={80} sx={{ mb: 3 }} />
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              Processing Your Data
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Please wait while we analyze your CSV file...
            </Typography>
          </Paper>
        </Container>
      ) : !csvData ? (
        // Upload Prompt
        <Container maxWidth="md" sx={{ mt: 10 }}>
          <Paper elevation={3} sx={{ p: 8, textAlign: 'center', borderRadius: 3, bgcolor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
            <CloudUpload sx={{ fontSize: 120, color: '#bdbdbd', mb: 3 }} />
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
              Upload Your CPG Data
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Upload a CSV file with columns: Date, StoreID, StoreName, ProductID, ProductName, 
              Category, Supplier, UnitPrice, UnitCost, OpeningStock, ReceivedQty, SoldQty, 
              ClosingStock, ForecastSales, ActualSales, ForecastError, ReorderLevel
            </Typography>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            <Button
              variant="contained"
              component="label"
              size="large"
              startIcon={<CloudUpload />}
              sx={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
                }
              }}
            >
              Choose CSV File
              <input type="file" hidden accept=".csv" onChange={handleFileUpload} />
            </Button>
          </Paper>
        </Container>
      ) : (
        <Container maxWidth={false} sx={{ width: "100%", px: 4 }}>
          {/* Filters */}
          <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Store</InputLabel>
                  <Select
                    value={selectedStore}
                    label="Store"
                    onChange={(e) => setSelectedStore(e.target.value)}
                  >
                    <MenuItem value="all">All Stores</MenuItem>
                    {stores.map(store => (
                      <MenuItem key={store} value={store}>{store}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={selectedCategory}
                    label="Category"
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <MenuItem value="all">All Categories</MenuItem>
                    {categories.map(cat => (
                      <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Chip 
                  label={`${filteredData.length} Records Loaded`} 
                  sx={{ 
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={2}>
                <Button
                  variant="contained"
                  startIcon={<BotIcon />}
                  fullWidth
                  disabled={loading}
                  onClick={onNavigateToChatBot}
                  sx={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
                    }
                  }}
                >
                  ChatBot
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* KPI Cards */}
          {metrics && (
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={3} sx={{ 
                  bgcolor: 'rgba(255, 255, 255, 0.95)', 
                  borderRadius: 3,
                  height: 180,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  borderTop: '4px solid #667eea',
                  backdropFilter: 'blur(10px)'
                }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography color="textSecondary" variant="body2" gutterBottom sx={{ fontWeight: 500 }}>
                      Forecast Sales
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: '#667eea', my: 1 }}>
                      {metrics.totalForecast.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      units predicted
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={3} sx={{ 
                  bgcolor: 'rgba(255, 255, 255, 0.95)', 
                  borderRadius: 3,
                  height: 180,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  borderTop: '4px solid #764ba2',
                  backdropFilter: 'blur(10px)'
                }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography color="textSecondary" variant="body2" gutterBottom sx={{ fontWeight: 500 }}>
                      Actual Sales
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: '#764ba2', my: 1 }}>
                      {metrics.totalActual.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      units sold
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={3} sx={{ 
                  bgcolor: 'rgba(255, 255, 255, 0.95)', 
                  borderRadius: 3,
                  height: 180,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  borderTop: '4px solid #f093fb',
                  backdropFilter: 'blur(10px)'
                }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography color="textSecondary" variant="body2" gutterBottom sx={{ fontWeight: 500 }}>
                      Forecast Accuracy
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: '#f093fb', my: 1 }}>
                      {metrics.accuracy}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      avg accuracy
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={3} sx={{ 
                  bgcolor: 'rgba(255, 255, 255, 0.95)', 
                  borderRadius: 3,
                  height: 180,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  borderTop: '4px solid #f5576c',
                  backdropFilter: 'blur(10px)'
                }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography color="textSecondary" variant="body2" gutterBottom sx={{ fontWeight: 500 }}>
                      Low Stock Alerts
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: '#f5576c', my: 1 }}>
                      {metrics.lowStockItems}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      items below reorder
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Charts */}
          <Grid container spacing={3}>
            {/* Forecast vs Actual Trend */}
            <Grid item xs={12} lg={8}>
              <Paper elevation={2} sx={{ p: 5, bgcolor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Forecast vs Actual Sales Trend
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="forecast" 
                      fill="#667eea" 
                      fillOpacity={0.3}
                      stroke="#667eea"
                      name="Forecast Sales"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="actual" 
                      stroke="#764ba2" 
                      strokeWidth={3}
                      name="Actual Sales"
                      dot={{ fill: '#764ba2', r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Category Distribution */}
            <Grid item xs={12} lg={4}>
              <Paper elevation={2} sx={{ p: 10, bgcolor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Sales by Category
                </Typography>
                <ResponsiveContainer width={550} height={250}>
                  <PieChart>
                    <Pie
                      data={categoryPerformance}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => entry.name}
                    >
                      {categoryPerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Store Performance */}
            <Grid item xs={12} lg={6}>
              <Paper elevation={2} sx={{ p: 5, bgcolor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Store Performance Comparison
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={storeComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="store" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="forecast" fill="#667eea" name="Forecast" />
                    <Bar dataKey="sales" fill="#764ba2" name="Actual Sales" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Forecast Accuracy Scatter */}
            <Grid item xs={12} lg={6}>
              <Paper elevation={2} sx={{ p: 5, bgcolor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Forecast Accuracy Analysis
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="forecast" name="Forecast" />
                    <YAxis dataKey="actual" name="Actual" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Legend />
                    <Scatter name="Products" data={forecastAccuracyData} fill="#f093fb" />
                  </ScatterChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Stock Movement */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 5, bgcolor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Stock Movement Analysis
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stockAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="opening" stroke="#667eea" name="Opening Stock" />
                    <Line type="monotone" dataKey="closing" stroke="#764ba2" name="Closing Stock" />
                    <Line type="monotone" dataKey="received" stroke="#f093fb" name="Received" />
                    <Line type="monotone" dataKey="sold" stroke="#f5576c" name="Sold" />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Low Stock Alerts */}
            {lowStockAlerts.length > 0 && (
              <Grid item xs={12}>
                <Paper elevation={2} sx={{ p: 3, bgcolor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Warning sx={{ color: '#f5576c', mr: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Low Stock Alerts
                    </Typography>
                  </Box>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Store</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">Current Stock</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">Reorder Level</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">Deficit</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lowStockAlerts.map((item, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell>{item.ProductName}</TableCell>
                            <TableCell>{item.Category}</TableCell>
                            <TableCell>{item.StoreName}</TableCell>
                            <TableCell align="right">{item.ClosingStock}</TableCell>
                            <TableCell align="right">{item.ReorderLevel}</TableCell>
                            <TableCell align="right" sx={{ color: '#f5576c', fontWeight: 600 }}>
                              {item.deficit}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label="REORDER" 
                                size="small" 
                                sx={{ 
                                  fontWeight: 600,
                                  bgcolor: '#f5576c',
                                  color: 'white'
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Container>
      )}
    </Box>
  );
};

export default CPGDashboard;
