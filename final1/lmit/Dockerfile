FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pil && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
ENV PORT=3000 DATA_DIR=/data COOKIE_SECURE=1
VOLUME /data
EXPOSE 3000
CMD ["node", "--no-warnings", "server/index.js"]
