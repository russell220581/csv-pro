import dotenv from 'dotenv';
dotenv.config();

// Critical startup validation
const requiredEnv = [
  'MONGO_URI',
  'JWT_SECRET',
  'REDIS_HOST',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_BUCKET_NAME',
];
requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`[FATAL ERROR] Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`,

  mongo: {
    uri: process.env.MONGO_URI,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRE || '30d',
  },

  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
  },

  s3: {
    endpoint: process.env.S3_ENDPOINT,
    port: parseInt(process.env.S3_PORT, 10) || 9000,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    bucketName: process.env.S3_BUCKET_NAME,
    region: process.env.S3_REGION,
    useSsl: process.env.S3_USE_SSL === 'true',
    publicEndpoint: process.env.S3_PUBLIC_ENDPOINT,
  },

  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM,
  },

  virusScan: {
    enabled: process.env.VIRUS_SCAN_ENABLED === 'true',
    maxFileSize: parseInt(process.env.MAX_SCAN_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
    failOpen: process.env.VIRUS_SCAN_FAIL_OPEN !== 'false' // default true
  },

  google: {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },

  stripe: {
    apiKey: process.env.STRIPE_API_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    paymentsEnabled: process.env.PAYMENTS_ENABLED === 'true',
  },

  cors: {
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  },
};

export default config;