#!/usr/bin/env fish

# 1. Set default depth to 2 if no argument is passed
set depth 2
if set -q argv[1]
    set depth $argv[1]
end

# 2. Build ignore string from .gitignore if the file exists
if test -f .gitignore
    # Read non-empty, non-comment lines and join them with '|'
    set ignore_patterns (grep -v '^#' .gitignore | grep -v '^$' | grep -v '^!' | string join '|')
    
    # Run tree with standard fish argument array slicing ($argv[2..-1])
    tree -I "$ignore_patterns" -L "$depth" -a --dirsfirst $argv[2..-1]
else
    tree -L "$depth" -a --dirsfirst $argv
end
