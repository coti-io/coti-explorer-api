FROM node:16 AS builder
ARG APPLICATION_NAME
WORKDIR /app
COPY ./package*.json ./
RUN npm install
COPY . .
RUN npm run build-${APPLICATION_NAME}


FROM node:16
ARG APPLICATION_NAME
ENV APPLICATION_NAME=${APPLICATION_NAME}
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm install --only=production
CMD ["npm", "run", "start-${APPLICATION_NAME}:prod"]