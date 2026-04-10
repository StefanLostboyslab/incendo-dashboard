# Stage 1: Build the React Application
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Accept the Build Argument
ARG VITE_MQTT_BROKER_URL
ENV VITE_MQTT_BROKER_URL=$VITE_MQTT_BROKER_URL

RUN npm run build

# Stage 2: Serve the app with Nginx
FROM nginx:alpine

# Copy the build output from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace default Nginx config if custom one exists (Optional)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 8080 as configured in nginx.conf
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
