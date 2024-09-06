# Use Node.js base image
FROM node:16

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the API port
EXPOSE 9000

# Run the API service
CMD ["node", "index.js"]
