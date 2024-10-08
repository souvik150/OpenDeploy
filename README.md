# Open Deploy

## Description
I built this project as an OpenSource version of Render.com or Netlify.com. This project is a work in progress and is not yet ready for production use.

This project has the following main components:

- build-server (Node.js) - This is the build server that listens for incoming build requests. It is built using Node.js and Express.js. It takes the github repository URL and the branch name as input and builds the project on Fargate container by running a task on ECS. It then uploads the build artifacts to an S3 bucket. It also publishes build logs to Kafka.

- s3-reverse-proxy (Node.js) - This is a reverse proxy server that serves static files from an S3 bucket. It is built using Node.js and Express.js. It takes the deployment URL as input and serves the static files from the S3 bucket.

- api-server (Node.js) - This is the backend server that handles all the API requests. It is built using Node.js and Express.js. It takes the github repository URL and the branch name as input and returns the build status and the deployment URL. It also saves logs from Kafka to an ClickHouse database.

## Deployed Links

[opendeploy.souvik150.com](https://opendeploy.souvik150.com/)

[powerful-inexpensive-furniture.opendeploy.souvik150.com/](https://powerful-inexpensive-furniture.opendeploy.souvik150.com/ ) 

## Documentation Link

Below is the Postman collection to test the APIs

[![Run in Postman](https://run.pstmn.io/button.svg)](https://documenter.getpostman.com/view/19816367/2sAXjQ2WB4)

## Internal Packages

- [@open-deploy/prisma-shared](https://www.npmjs.com/package/@open-deploy/prisma-schema) - This is a shared library for Prisma data models. Any changes to the database schema should be made in this package.

