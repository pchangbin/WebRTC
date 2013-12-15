#!/bin/bash

[[ -x "$(which bundle)" ]] && (
  echo "'bundle' is not ready" >&2
  exit -1
)

# Launch jekyll as daemon
#options=--detach

exec bundle exec jekyll serve $options $@
