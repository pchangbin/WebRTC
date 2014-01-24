#!/bin/bash

if [[ ! -x "$(which bundle)" ]];then
  echo "'bundle' is not ready" >&2
  exit -1
fi

declare options
# Launch jekyll as daemon
#options+=--detach

# Watch for changes and rebuild
options+=--watch

exec bundle exec jekyll serve $options $@
