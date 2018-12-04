#!/usr/bin/env bash

set -e

export npm_config_proxy=http://npm-proxy:8080
export npm_config_https_proxy=http://npm-proxy:8080
export npm_config_strict_ssl=false
export yarn_httpproxy=http://npm-proxy:8080
export yarn_httpsproxy=http://npm-proxy:8080
export yarn_strictssl=false
export HTTP_PROXY=http://npm-proxy:8080
export HTTPS_PROXY=http://npm-proxy:8080

yarn config list

echo "--- yarn in root"
yarn --frozen-lockfile --network-timeout 60000

cd $1
echo "--- cover"
yarn -s run cover

echo "--- report"
yarn -s run nyc report -r json --report-dir coverage


