# Add this to your shell config file
local depth="${1:-2}"  # Default depth = 2
local ignore_patterns

# Build ignore string from .gitignore
if [[ -f .gitignore ]]; then
ignore_patterns=$(grep -v '^#' .gitignore | grep -v '^$' | grep -v '^!' | tr '\n' '|' | sed 's/|$//')
tree -I "$ignore_patterns" -L "$depth" -a --dirsfirst "$@"
else
tree -L "$depth" -a --dirsfirst "$@"
fi