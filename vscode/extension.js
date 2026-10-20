'use strict';

const fs = require('node:fs');
const vscode = require('vscode');
const { buildState, diffStates } = require('./lib/state');
const fight = require('./lib/fight');
const { recordCommand, MAX_OUTPUT } = require('./lib/capture');
const { store } = require('./lib/engine');

const views = new Set(); // every live webview (sidebar + editor tabs)
let lastState = null;
let lastLadder = null;
let ladderTimer = null;
const LADDER_REFRESH_MS = 10 * 60 * 1000;
let refreshTimer = null;

const config = () => vscode.workspace.getConfiguration('bugzoo');

function safeState() {
  try {
    const folders = (vscode.workspace.workspaceFolders || []).map((f) => f.uri.fsPath);
    return buildState(folders);
  } catch {
    return null; // a half-written dex.json must never break the editor
  }
}

function pushState(withEvents) {
  const next = safeState();
  if (!next) return;
  const events = withEvents ? diffStates(lastState, next) : null;
  lastState = next;
  for (const v of views) v.webview.postMessage({ type: 'state', state: next, events });
  return events;
}

async function refreshLadder() {
  try {
    lastLadder = await fight.loadArena();
  } catch {
    return; // keep whatever we showed before
  }
  for (const v of views) v.webview.postMessage({ type: 'ladder', ladder: lastLadder });
}

const post = (view, msg) => view.webview.postMessage(msg);

async function askName() {
  const name = await vscode.window.showInputBox({
    title: 'Bug Zoo player name',
    prompt: 'Your name on the ladder (shown to other players)',
    validateInput: (v) => (v.trim() ? null : 'Pick a name'),
  });
  return name && fight.saveName(name) ? name : null;
}

async function onWebviewMessage(view, msg) {
  if (!msg) return;
  if (msg.type === 'ready') {
    const state = lastState || safeState();
    if (state) post(view, { type: 'state', state, events: null });
    if (lastLadder) post(view, { type: 'ladder', ladder: lastLadder });
    else refreshLadder();
  } else if (msg.type === 'fight') {
    post(view, { type: 'battle', battle: fight.fight(msg.section, msg.name) });
  } else if (msg.type === 'submit') {
    if (fight.needsName() && !(await askName())) return;
    const url = fight.submissionUrl();
    if (url) await vscode.env.openExternal(vscode.Uri.parse(url));
  } else if (msg.type === 'addFriend') {
    const input = await vscode.window.showInputBox({
      title: 'Add a friend',
      prompt: 'Paste a friend code (BZ1...), a link, a file path, or a player name from the ladder',
    });
    if (!input) return;
    const r = await fight.addFriend(input);
    if (r.ok) vscode.window.showInformationMessage(`${r.updated ? 'Updated' : 'Added'} ${r.name}.`);
    else vscode.window.showWarningMessage(r.reason === 'self' ? 'That is you!' : 'Could not read that friend.');
    refreshLadder();
  } else if (msg.type === 'removeFriend') {
    fight.removeFriend(msg.name);
    refreshLadder();
  } else if (msg.type === 'copyCode') {
    if (fight.needsName() && !(await askName())) return;
    const code = fight.myCode();
    if (!code) {
      vscode.window.showInformationMessage('Catch a bug first: your friend code is made from your strongest catches.');
      return;
    }
    await vscode.env.clipboard.writeText(code);
    vscode.window.showInformationMessage('Friend code copied. Send it to a friend; they paste it into Add friend.');
  } else if (msg.type === 'refreshArena') {
    refreshLadder();
  }
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    const events = pushState(true);
    if (events && config().get('notifications')) announce(events);
  }, 150);
}

function announce(events) {
  for (const c of events.caught) {
    vscode.window.setStatusBarMessage(`$(check) Bug Zoo: caught ${c.name} the ${c.type}!`, 6000);
    vscode.window.showInformationMessage(`Caught ${c.name} the ${c.type}! It joined your zoo.`);
  }
  for (const c of events.spawned) {
    vscode.window.setStatusBarMessage(`$(bug) Bug Zoo: a wild ${c.name} the ${c.type} appeared`, 6000);
    vscode.window.showWarningMessage(
      `A wild ${c.name} the ${c.type} appeared! Fix the bug and re-run the command to catch it.`,
      'Open the zoo',
    ).then((pick) => {
      if (pick) vscode.commands.executeCommand('bugzoo.zoo.focus');
    });
  }
}

function webviewHtml(webview, extensionUri) {
  const asset = (name) => webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', name));
  const nonce = Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${asset('zoo.css')}">
<title>Bug Zoo</title></head>
<body>
<div class="bar" id="bar"></div>
<div class="zoo" id="zoo"><div class="pen" id="pen" data-label="caught"></div><div class="empty" id="empty"></div></div>
<div class="ladder" id="ladder" hidden></div>
<div class="arena" id="arena" hidden></div>
<script nonce="${nonce}" src="${asset('zoo.js')}"></script>
<script nonce="${nonce}" src="${asset('arena.js')}"></script>
</body></html>`;
}

function attach(view, extensionUri) {
  view.webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')] };
  view.webview.html = webviewHtml(view.webview, extensionUri);
  views.add(view);
  view.webview.onDidReceiveMessage((msg) => onWebviewMessage(view, msg));
  view.onDidDispose(() => views.delete(view));
}

function watchDex(context) {
  const { dir } = store.dexPath();
  try {
    fs.mkdirSync(dir, { recursive: true });
    const w = fs.watch(dir, (_event, name) => {
      if (!name || name === 'dex.json') scheduleRefresh();
    });
    context.subscriptions.push({ dispose: () => w.close() });
  } catch {
    // no watcher: the zoo still refreshes after each captured command
  }
}

/** Terminal capture through shell integration: read the output of each command, record it when it ends. */
function captureTerminal(context) {
  if (typeof vscode.window.onDidStartTerminalShellExecution !== 'function') return;
  const running = new Map(); // execution -> { chunks, size, done }

  context.subscriptions.push(
    vscode.window.onDidStartTerminalShellExecution((e) => {
      if (!config().get('captureTerminal')) return;
      const entry = { chunks: [], size: 0, done: null };
      entry.done = (async () => {
        try {
          for await (const data of e.execution.read()) {
            entry.chunks.push(data);
            entry.size += data.length;
            while (entry.size > MAX_OUTPUT && entry.chunks.length > 1) entry.size -= entry.chunks.shift().length;
          }
        } catch {
          // stream closed early: use what we have
        }
      })();
      running.set(e.execution, entry);
    }),
    vscode.window.onDidEndTerminalShellExecution(async (e) => {
      const entry = running.get(e.execution);
      if (!entry) return;
      running.delete(e.execution);
      await Promise.race([entry.done, new Promise((r) => setTimeout(r, 800))]);
      try {
        recordCommand({
          commandLine: e.execution.commandLine && e.execution.commandLine.value,
          exitCode: e.exitCode,
          cwd: e.execution.cwd && e.execution.cwd.fsPath,
          output: entry.chunks.join(''),
        });
        scheduleRefresh();
      } catch {
        // capturing is best effort and must never disturb the user's terminal
      }
    }),
  );
}

function activate(context) {
  const provider = {
    resolveWebviewView(view) {
      attach(view, context.extensionUri);
    },
  };
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('bugzoo.zoo', provider, { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.commands.registerCommand('bugzoo.openZoo', () => {
      const panel = vscode.window.createWebviewPanel('bugzooPanel', 'Bug Zoo', vscode.ViewColumn.Beside, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      });
      attach(panel, context.extensionUri);
    }),
    vscode.commands.registerCommand('bugzoo.toggleCapture', async () => {
      const on = !config().get('captureTerminal');
      await config().update('captureTerminal', on, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`Bug Zoo terminal capture ${on ? 'on' : 'off'}.`);
    }),
  );
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(scheduleRefresh));
  lastState = safeState();
  refreshLadder();
  ladderTimer = setInterval(refreshLadder, LADDER_REFRESH_MS);
  watchDex(context);
  captureTerminal(context);
}

function deactivate() {
  clearTimeout(refreshTimer);
  clearInterval(ladderTimer);
}

module.exports = { activate, deactivate };
