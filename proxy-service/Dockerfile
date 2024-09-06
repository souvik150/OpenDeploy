# Use Node.js base image
FROM node:16

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the proxy port
EXPOSE 8000

# Define environment variables
ENV NODE_ENV production

# Run the proxy service
CMD ["node", "index.js"]
