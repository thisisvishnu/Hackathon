import React, { useState, useMemo } from 'react';
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
  Alert
} from '@mui/material';
import {
  CloudUpload,
  TrendingUp,
  Warning,
  Inventory,
  Assessment
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

const CPGDashboard = () => {
  const [csvData, setCsvData] = useState(null);
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
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
      console.error('Error parsing CSV:', error);
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

  const COLORS = ['#1976d2', '#dc004e', '#f57c00', '#388e3c', '#7b1fa2', '#0097a7'];

  return (
    <Box sx={{ bgcolor: '#f5f7fa', minHeight: '100vh', pb: 4 }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e0e0e0', mb: 3 }}>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Assessment sx={{ fontSize: 48, color: '#1976d2' }} />
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
              sx={{ px: 4 }}
            >
              Upload CSV Data
              <input type="file" hidden accept=".csv" onChange={handleFileUpload} />
            </Button>
          </Box>
        </Container>
      </Box>

      {!csvData ? (
        // Upload Prompt
        <Container maxWidth="md" sx={{ mt: 10 }}>
          <Paper elevation={3} sx={{ p: 8, textAlign: 'center', borderRadius: 3 }}>
            <CloudUpload sx={{ fontSize: 120, color: '#bdbdbd', mb: 3 }} />
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
              Upload Your CPG Data
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Upload a CSV file with columns: Date, StoreID, StoreName, ProductID, ProductName, 
              Category, Supplier, UnitPrice, UnitCost, OpeningStock, ReceivedQty, SoldQty, 
              ClosingStock, ForecastSales, ActualSales, ForecastError, ReorderLevel
            </Typography>
            <Button
              variant="contained"
              component="label"
              size="large"
              startIcon={<CloudUpload />}
            >
              Choose CSV File
              <input type="file" hidden accept=".csv" onChange={handleFileUpload} />
            </Button>
          </Paper>
        </Container>
      ) : (
        <Container maxWidth="xl">
          {/* Filters */}
          <Paper elevation={0} sx={{ p: 2, mb: 3 }}>
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
              <Grid item xs={12} md={4}>
                <Chip 
                  label={`${filteredData.length} Records Loaded`} 
                  color="primary" 
                  sx={{ fontWeight: 600 }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* KPI Cards */}
          {metrics && (
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={0} sx={{ bgcolor: '#e3f2fd', borderLeft: '4px solid #1976d2' }}>
                  <CardContent>
                    <Typography color="textSecondary" variant="body2" gutterBottom>
                      Forecast Sales
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2' }}>
                      {metrics.totalForecast.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      units predicted
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={0} sx={{ bgcolor: '#e8f5e9', borderLeft: '4px solid #388e3c' }}>
                  <CardContent>
                    <Typography color="textSecondary" variant="body2" gutterBottom>
                      Actual Sales
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#388e3c' }}>
                      {metrics.totalActual.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      units sold
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={0} sx={{ bgcolor: '#fff3e0', borderLeft: '4px solid #f57c00' }}>
                  <CardContent>
                    <Typography color="textSecondary" variant="body2" gutterBottom>
                      Forecast Accuracy
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#f57c00' }}>
                      {metrics.accuracy}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      avg accuracy
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card elevation={0} sx={{ bgcolor: '#ffebee', borderLeft: '4px solid #dc004e' }}>
                  <CardContent>
                    <Typography color="textSecondary" variant="body2" gutterBottom>
                      Low Stock Alerts
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#dc004e' }}>
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
              <Paper elevation={2} sx={{ p: 3 }}>
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
                      fill="#1976d2" 
                      fillOpacity={0.3}
                      stroke="#1976d2"
                      name="Forecast Sales"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="actual" 
                      stroke="#388e3c" 
                      strokeWidth={3}
                      name="Actual Sales"
                      dot={{ fill: '#388e3c', r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Category Distribution */}
            <Grid item xs={12} lg={4}>
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Sales by Category
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
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
              <Paper elevation={2} sx={{ p: 3 }}>
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
                    <Bar dataKey="forecast" fill="#1976d2" name="Forecast" />
                    <Bar dataKey="sales" fill="#388e3c" name="Actual Sales" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Forecast Accuracy Scatter */}
            <Grid item xs={12} lg={6}>
              <Paper elevation={2} sx={{ p: 3 }}>
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
                    <Scatter name="Products" data={forecastAccuracyData} fill="#7b1fa2" />
                  </ScatterChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Stock Movement */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3 }}>
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
                    <Line type="monotone" dataKey="opening" stroke="#1976d2" name="Opening Stock" />
                    <Line type="monotone" dataKey="closing" stroke="#388e3c" name="Closing Stock" />
                    <Line type="monotone" dataKey="received" stroke="#f57c00" name="Received" />
                    <Line type="monotone" dataKey="sold" stroke="#dc004e" name="Sold" />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Low Stock Alerts */}
            {lowStockAlerts.length > 0 && (
              <Grid item xs={12}>
                <Paper elevation={2} sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Warning sx={{ color: '#dc004e', mr: 1 }} />
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
                            <TableCell align="right" sx={{ color: '#dc004e', fontWeight: 600 }}>
                              {item.deficit}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label="REORDER" 
                                size="small" 
                                color="error"
                                sx={{ fontWeight: 600 }}
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
