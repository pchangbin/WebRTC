#!/bin/bash

if [[ ! -x "$(which bundle)" ]];then
  echo "'bundle' is not ready" >&2
  exit -1
fi

# Launch jekyll as daemon
#options=--detach

exec bundle exec jekyll serve $options $@
