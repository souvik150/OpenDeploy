# Open Deploy [Project WIP]

## Description
I built this project as an OpenSource version of Render.com or Netlify.com. This project is a work in progress and is not yet ready for production use.

This project has the following main components:

- build-server (Node.js)
This is the build server that listens for incoming build requests. It is built using Node.js and Express.js. It takes the github repository URL and the branch name as input and builds the project on Fargate container by running a task on ECS. It then uploads the build artifacts to an S3 bucket.

- s3-reverse-proxy (Node.js)
  
This is a reverse proxy server that serves static files from an S3 bucket. It is built using Node.js and Express.js. It takes the deployment URL as input and serves the static files from the S3 bucket.

- api-server (Node.js)
This is the backend server that handles all the API requests. It is built using Node.js and Express.js. It takes the github repository URL and the branch name as input and returns the build status and the deployment URL.

## Documentation Link

[![Postman Documentation](https://img.shields.io/badge/Postman-Documentation-orange)](https://documenter.getpostman.com/view/19816367/2sAXjQ2WB4)
This project is documented using Postman. You can find the documentation above.