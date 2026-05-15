import { CLI_BIN } from "./ui.js";

const COMMANDS = [
  "login",
  "logout",
  "status",
  "projects",
  "envs",
  "pull",
  "push",
  "delete",
  "init",
  "logo",
  "help",
  "completion",
];

const ALIASES = [
  "li",
  "lo",
  "st",
  "ls",
  "p",
  "e",
  "env",
  "list",
  "pl",
  "get",
  "down",
  "ps",
  "up",
  "put",
  "rm",
  "del",
  "setup",
];

export function printCompletionScript(shell: string): void {
  const all = [...COMMANDS, ...ALIASES].join(" ");

  if (shell === "bash") {
    console.log(`# DotVault (${CLI_BIN}) bash completion
_${CLI_BIN}_completions() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "${all}" -- "$cur") )
  fi
}
complete -F _${CLI_BIN}_completions ${CLI_BIN} dot-vault dotvault
`);
    return;
  }

  if (shell === "zsh") {
    console.log(`# DotVault (${CLI_BIN}) zsh completion — add to ~/.zshrc
_${CLI_BIN}() {
  local -a cmds
  cmds=(${COMMANDS.map((c) => `"${c}"`).join(" ")})
  _arguments '*:command:($cmds)'
}
compdef _${CLI_BIN} ${CLI_BIN} dot-vault dotvault
`);
    return;
  }

  console.error(`Unsupported shell: ${shell}. Use: bash | zsh`);
  process.exit(1);
}
