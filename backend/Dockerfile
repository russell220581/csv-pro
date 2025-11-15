FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY packages/cleaning-engine/package.json ./packages/cleaning-engine/package.json

RUN npm install

COPY backend ./backend
COPY packages ./packages

WORKDIR /app/backend
EXPOSE 5000
CMD ["npm", "run", "dev"]