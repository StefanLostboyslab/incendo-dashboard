FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Accept the Build Argument
ARG VITE_MQTT_BROKER_URL
ENV VITE_MQTT_BROKER_URL=$VITE_MQTT_BROKER_URL

RUN npm run build

# Expose Vite's default port
EXPOSE 8080

# Run vite preview to serve the built app on LAN
CMD ["npm", "run", "preview", "--", "--host", "--port", "8080"]
