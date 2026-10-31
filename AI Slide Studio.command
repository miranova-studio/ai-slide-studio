#!/bin/bash
set +x
cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  echo 'Node.js が見つかりません。README.md を確認してください。'
  read -r -p 'Enterで閉じます。' _
  exit 1
fi
node scripts/launch.mjs
result=$?
if [ "$result" -ne 0 ]; then
  read -r -p 'Enterで閉じます。' _
fi
exit "$result"
