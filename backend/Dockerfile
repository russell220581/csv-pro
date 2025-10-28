FROM node:20-alpine
WORKDIR /app

# Copy root package.json and workspace config
COPY package.json .
COPY package-lock.json .

# Copy backend package.json
COPY backend/package.json ./backend/package.json

# Copy cleaning-engine package.json
COPY packages/cleaning-engine/package.json ./packages/cleaning-engine/package.json

# Install all workspace dependencies
RUN npm install

# Copy all source code
COPY backend/ ./backend/
COPY packages/cleaning-engine/ ./packages/cleaning-engine/

WORKDIR /app/backend
EXPOSE 5000
CMD ["npm", "run", "dev"]