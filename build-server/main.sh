#!/bin/bash

export GIT_REPOSITORY__URL = "$GIT_REPOSITORY_URL"

git clone "$GIT_REPOSITORY__URL" /home/app/output

exec node script.js