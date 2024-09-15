#! /bin/bash

word(){ sed `perl -e "print int rand(99999)"`"q;d" /usr/share/dict/words }

appname=$1
gh repo create $appname \
  --template https://github.com/mrgnw/shadcn-svelte-template \
  --private --clone
cd $appname