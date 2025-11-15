import { Server } from 'socket.io';
import Redis from 'ioredis';

export const initSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: [process.env.FRONTEND_URL, 'http://localhost:5173'],
            credentials: true
        }
    });

    // Create Redis subscriber for worker events
    const redisSubscriber = new Redis({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
    });

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        // Subscribe to job updates when client joins a job room
        socket.on('subscribeToJob', (jobId) => {
            socket.join(jobId);
            console.log(`Client ${socket.id} subscribed to job ${jobId}`);
            
            // Subscribe to Redis channel for this job
            redisSubscriber.subscribe(`job:${jobId}`, (err) => {
                if (err) console.error('Redis subscribe error:', err);
            });
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    // Listen for Redis messages and broadcast to Socket.IO rooms
    redisSubscriber.on('message', (channel, message) => {
        const jobId = channel.replace('job:', '');
        const data = JSON.parse(message);
        
        switch (data.type) {
            case 'progress':
                io.to(jobId).emit('progressUpdate', {
                    percentage: data.percentage,
                    message: data.message
                });
                break;
            case 'completed':
                io.to(jobId).emit('jobCompleted', { jobId: data.jobId });
                break;
            case 'failed':
                io.to(jobId).emit('jobFailed', data);
                break;
        }
    });

    return io;
};