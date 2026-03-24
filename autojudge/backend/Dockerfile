# Use Node.js 20 as base
FROM node:20-slim

# Install system dependencies (compilers and runtimes)
RUN apt-get update && apt-get install -y \
    g++ \
    gcc \
    openjdk-17-jdk-headless \
    python3 \
    python3-pip \
    zip \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Create uploads and reports directories
RUN mkdir -p uploads/reports && chmod -R 777 uploads

# Expose the backend port
EXPOSE 10000

# Start the application
CMD ["npm", "start"]
