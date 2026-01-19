'use client';

import React, { useEffect } from 'react';
import { Box, Container, Grid, Paper, Typography, CircularProgress, Card, CardContent, Button } from '@mui/material';
import { useAnalyticsStore } from '../../src/store/analyticsStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function AnalyticsPage() {
    const { dashboardStats, fetchDashboardStats, loading } = useAnalyticsStore();
    const router = useRouter();

    useEffect(() => {
        fetchDashboardStats();
    }, [fetchDashboardStats]);

    if (loading || !dashboardStats) {
        return (
            <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress />
            </Box>
        );
    }

    const chartData = [
        { name: 'Total Messages', value: dashboardStats.totalMessages },
        { name: 'Total Users', value: dashboardStats.totalUsers },
        { name: 'Total Rooms', value: dashboardStats.totalRooms },
        { name: 'Active (24h)', value: dashboardStats.activeUsers24h },
    ];

    return (
        <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', py: 4 }}>
            <Container maxWidth="lg">
                <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={() => router.push('/chat')}
                            sx={{ mr: 2 }}
                        >
                            Back to Chat
                        </Button>
                        <Typography variant="h4" fontWeight="bold" color='grey'>Analytics Dashboard</Typography>
                    </Box>
                    <Button variant="contained" onClick={() => fetchDashboardStats()}>Refresh</Button>
                </Box>

                <Grid container spacing={3}>
                    {/* Summary Cards */}
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ textAlign: 'center', borderRadius: 2 }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>Total Messages</Typography>
                                <Typography variant="h4" fontWeight="bold">{dashboardStats.totalMessages}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ textAlign: 'center', borderRadius: 2 }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>Total Users</Typography>
                                <Typography variant="h4" fontWeight="bold">{dashboardStats.totalUsers}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ textAlign: 'center', borderRadius: 2 }}>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>Total Rooms</Typography>
                                <Typography variant="h4" fontWeight="bold">{dashboardStats.totalRooms}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ textAlign: 'center', borderRadius: 2, bgcolor: '#e3f2fd' }}>
                            <CardContent>
                                <Typography color="primary" gutterBottom>Active Users (24h)</Typography>
                                <Typography variant="h4" fontWeight="bold" color="primary">{dashboardStats.activeUsers24h}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Charts */}
                    <Grid size={{ xs: 12, md: 8 }}>
                        <Paper sx={{ p: 3, borderRadius: 2, height: 400 }}>
                            <Typography variant="h6" gutterBottom>Activity Overview</Typography>
                            <ResponsiveContainer width="100%" height="90%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                        <Paper sx={{ p: 3, borderRadius: 2, height: 400 }}>
                            <Typography variant="h6" gutterBottom>Distribution</Typography>
                            <ResponsiveContainer width="100%" height="90%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
}
