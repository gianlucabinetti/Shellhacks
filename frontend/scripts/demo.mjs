// One command for phone demos: `npm run demo` (from the repo root or frontend/).
//
// 1. Starts the backend on :8000 unless it is already running.
// 2. Builds the frontend and serves the build on :4173 (`vite preview`, which also
//    forwards /api to the backend). A production build is a handful of files, so it
//    loads far faster through a tunnel than the dev server's hundreds of modules.
// 3. Opens a Cloudflare quick tunnel over HTTP/2 (campus Wi-Fi blocks QUIC/UDP),
//    waits until the public address answers, then opens it in the laptop's browser
//    so Share's QR code points at an address any phone can reach.
//
// Flags: --no-open (don't open the browser), --no-build (serve the existing dist/).
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { delimiter, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FRONTEND = fileURLToPath(new URL('..', import.meta.url))
const ROOT = join(FRONTEND, '..')
const BACKEND_URL = 'http://localhost:8000'
const SITE_PORT = 4173
const SITE_URL = `http://localhost:${SITE_PORT}`
const WINDOWS = process.platform === 'win32'
const VITE = join(FRONTEND, 'node_modules', 'vite', 'bin', 'vite.js')
const args = new Set(process.argv.slice(2))

const children = []
let stopping = false

const log = (tag, message) => console.log(`\x1b[36m[${tag}]\x1b[0m ${message}`)

function fail(message) {
  console.error(`\n\x1b[31m✖ ${message}\x1b[0m\n`)
  stop(1)
}

function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) if (child.exitCode === null) child.kill()
  process.exit(code)
}
process.on('SIGINT', () => { console.log('\nStopped. The public link no longer works.'); stop(0) })
process.on('SIGTERM', () => stop(0))

/** Starts a long-running process; if it dies before we stop, show its last output and quit. */
function start(tag, command, commandArgs, { cwd = FRONTEND, onLine } = {}) {
  const child = spawn(command, commandArgs, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
  const recent = []
  const read = chunk => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (!line.trim()) continue
      recent.push(line)
      if (recent.length > 15) recent.shift()
      onLine?.(line)
    }
  }
  child.stdout.on('data', read)
  child.stderr.on('data', read)
  child.on('error', error => fail(`${tag}: could not start ${command} (${error.message})`))
  child.on('exit', code => {
    if (!stopping) fail(`${tag} exited (code ${code}). Last output:\n${recent.join('\n')}`)
  })
  children.push(child)
  return child
}

/** Runs a command to completion, streaming its output. */
function run(command, commandArgs, cwd = FRONTEND) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { cwd, stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', code => (code === 0 ? resolve() : reject(new Error(`exit code ${code}`))))
  })
}

async function responds(url, timeout = 4000) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeout) })
    return response.ok
  } catch {
    return false
  }
}

async function waitFor(check, seconds, message) {
  const deadline = Date.now() + seconds * 1000
  while (Date.now() < deadline) {
    if (await check()) return
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  fail(message)
}

/** Known install locations first: a terminal opened before installing won't have it on PATH. */
function findCloudflared() {
  const exe = WINDOWS ? 'cloudflared.exe' : 'cloudflared'
  const candidates = [
    process.env.CLOUDFLARED,
    WINDOWS && join(process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)', 'cloudflared', exe),
    WINDOWS && join(process.env.ProgramFiles ?? 'C:\\Program Files', 'cloudflared', exe),
    WINDOWS && process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links', exe),
    !WINDOWS && '/opt/homebrew/bin/cloudflared',
    !WINDOWS && '/usr/local/bin/cloudflared',
    ...(process.env.PATH ?? '').split(delimiter).filter(Boolean).map(dir => join(dir, exe)),
  ]
  return candidates.find(path => path && existsSync(path))
}

function findPython() {
  const venv = [join(ROOT, '.venv', 'Scripts', 'python.exe'), join(ROOT, '.venv', 'bin', 'python')]
  return venv.find(existsSync) ?? (WINDOWS ? 'python' : 'python3')
}

function openBrowser(url) {
  const [command, commandArgs] = WINDOWS ? ['cmd', ['/c', 'start', '', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]]
  spawn(command, commandArgs, { stdio: 'ignore', detached: true }).on('error', () => undefined).unref()
}

async function main() {
  const cloudflared = findCloudflared()
  if (!cloudflared) {
    fail('cloudflared is not installed. Install it once, then run npm run demo again:\n'
      + (WINDOWS ? '    winget install --id Cloudflare.cloudflared' : '    brew install cloudflared'))
  }
  if (!existsSync(VITE)) fail('Frontend packages are missing. Run: cd frontend && npm install')

  // 1. Backend
  if (await responds(`${BACKEND_URL}/api/health`)) {
    log('backend', 'already running on :8000')
  } else {
    const python = findPython()
    log('backend', `starting with ${python}`)
    start('backend', python, ['-m', 'uvicorn', 'backend.main:app', '--port', '8000'], { cwd: ROOT })
    await waitFor(() => responds(`${BACKEND_URL}/api/health`), 45,
      'The backend did not start. Check that the Python packages are installed (pip install -r requirements.txt).')
    log('backend', 'ready on :8000')
  }

  // 2. Frontend build + static server
  if (args.has('--no-build') && existsSync(join(FRONTEND, 'dist', 'index.html'))) {
    log('site', 'using the existing build')
  } else {
    log('site', 'building the app…')
    await run(process.execPath, [VITE, 'build', '--logLevel', 'error']).catch(error => fail(`Build failed (${error.message}).`))
  }
  if (await responds(SITE_URL)) fail(`Port ${SITE_PORT} is already in use. Stop the other demo first.`)
  start('site', process.execPath, [VITE, 'preview', '--port', String(SITE_PORT), '--strictPort'])
  await waitFor(() => responds(`${SITE_URL}/api/health`), 30, `The site did not start on :${SITE_PORT}.`)
  log('site', `serving the build on :${SITE_PORT}`)

  // 3. Public tunnel
  log('tunnel', 'opening a public link (HTTP/2)…')
  let publicUrl
  let connected = false
  start('tunnel', cloudflared, ['tunnel', '--no-autoupdate', '--protocol', 'http2', '--url', SITE_URL], {
    onLine: line => {
      // Error lines can mention https://api.trycloudflare.com; that is not the tunnel's address.
      publicUrl ??= line.match(/https:\/\/(?!api\.)[a-z0-9-]+\.trycloudflare\.com/)?.[0]
      if (/Registered tunnel connection/i.test(line)) connected = true
      if (/\bERR\b/.test(line) && connected) log('tunnel', line.replace(/^\S+\s+ERR\s*/, 'warning: '))
    },
  })
  await waitFor(() => Boolean(publicUrl && connected), 45,
    'Cloudflare did not accept the tunnel. This network may block it; switch to a phone hotspot and try again.')
  // The address can take a few seconds to start routing after the connection registers.
  await waitFor(() => responds(`${publicUrl}/api/health`, 8000), 60,
    `The tunnel opened but ${publicUrl} is not answering yet. Try again, or switch networks.`)

  console.log(`
  \x1b[32m●\x1b[0m Portfolio X-Ray is live at:

      \x1b[1m${publicUrl}\x1b[0m

  Works on any phone, on Wi-Fi or cellular. Open it on this laptop and press
  Share: the QR code now points here. The address changes every time this runs.

  Anyone with the link can use the app, including AI features billed to AWS.
  Keep this window open during the demo; press Ctrl+C to stop sharing.
`)
  if (!args.has('--no-open')) openBrowser(publicUrl)
}

main().catch(error => fail(error instanceof Error ? error.message : String(error)))
