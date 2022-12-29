#!/bin/bash

DIR_PATH=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd "$DIR_PATH/.." 
node --loader ts-node/esm --no-warnings cron/fetchStats.ts
