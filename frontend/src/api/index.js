import axios from 'axios';

// Create an Axios instance with a pre-configured base URL
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
});

export default api;