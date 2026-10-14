'use strict';

const COMMANDS = ['node', 'npm', 'npx', 'pnpm', 'yarn', 'bun', 'deno', 'python', 'python3', 'pytest',
  'cargo', 'go', 'make', 'java', 'mvn', 'gradle', 'dotnet', 'ruby', 'php'];

/**
 * Shell snippet that routes common dev commands through `bugzoo run`.
 * With no arguments the real command is used untouched (so REPLs keep working).
 */
function snippet(shell) {
  switch (shell) {
    case 'bash':
    case 'zsh':
      return COMMANDS
        .map((c) => `${c}() { if [ $# -eq 0 ]; then command ${c}; else command bugzoo run ${c} "$@"; fi; }`)
        .join('\n');
    case 'fish':
      return COMMANDS
        .map((c) => `function ${c}; if test (count $argv) -eq 0; command ${c}; else; command bugzoo run ${c} $argv; end; end`)
        .join('\n');
    case 'powershell':
    case 'pwsh':
      return COMMANDS
        .map((c) => `function global:${c} { if ($args.Count -eq 0) { & (Get-Command ${c} -CommandType Application | Select-Object -First 1).Source } else { bugzoo run ${c} @args } }`)
        .join('\n');
    default:
      return null;
  }
}

module.exports = { COMMANDS, snippet };
