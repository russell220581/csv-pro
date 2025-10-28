import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import config from './index.js';

export function initSocket(server) {
    // --- ADD THIS LOG ---
    const allowedOrigins = [config.cors.clientUrl, 'http://localhost:5173'];
    console.log('[SERVER DEBUG] Socket.IO configured with allowed origins:', allowedOrigins);
    // --- END ADD ---
    
    const io = new Server(server, {
        cors: {
            // Allow connections from the configured client URL AND the default Vite dev server port.
            origin: [config.cors.clientUrl, 'http://localhost:5173'],
            methods: ["GET", "POST"]
        }
    });

    // Create Redis clients for pub/sub
    const pubClient = createClient({ url: `redis://${config.redis.host}:${config.redis.port}` });
    const subClient = pubClient.duplicate();
    
    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        console.log('Socket.IO is now using the Redis adapter.');
    });

    console.log('Socket.IO server initialized.');

    io.on('connection', (socket) => {
        console.log(`New client connected: ${socket.id}`);
        socket.on('subscribeToJob', (jobId) => {
            socket.join(jobId);
        });
        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });
}