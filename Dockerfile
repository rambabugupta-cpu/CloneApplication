FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production
RUN npm run build
EXPOSE 5000
CMD ["npm","start"]
