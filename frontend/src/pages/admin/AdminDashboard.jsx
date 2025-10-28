import { useState, useEffect } from 'react';
import api from '../../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import Spinner from '../../components/common/Spinner';

const StatCard = ({ title, value, description }) => (
    <div className="stat bg-base-100 shadow-lg rounded-box">
        <div className="stat-title">{title}</div>
        <div className="stat-value text-primary">{value}</div>
        <div className="stat-desc">{description}</div>
    </div>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, chartsRes] = await Promise.all([
                    api.get('/admin/stats'),
                    api.get('/admin/charts')
                ]);
                setStats(statsRes.data.data);
                setChartData(chartsRes.data.data);
            } catch (error) {
                console.error("Failed to fetch admin data", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) return <Spinner message="Loading dashboard data..." size="lg" />;

    return (
        <div className="space-y-6">
            <div className="stats shadow w-full">
                <StatCard title="Total Users" value={stats?.totalUsers} description="All registered users" />
                <StatCard title="Premium Users" value={stats?.premiumUsers} description="Active subscribers" />
                <StatCard title="Total Jobs" value={stats?.totalJobs} description="Processed since launch" />
                <StatCard title="New Users" value={stats?.newUsers} description="In the last 30 days" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card bg-base-100 shadow-lg">
                    <div className="card-body">
                        <h2 className="card-title">User Registrations (Last 7 Days)</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData?.userActivity}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="_id" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="count" fill="#8884d8" name="New Users" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="card bg-base-100 shadow-lg">
                    <div className="card-body">
                         <h2 className="card-title">Jobs Processed (Last 7 Days)</h2>
                         <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData?.jobActivity}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="_id" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="count" stroke="#82ca9d" name="Jobs" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;