'use client'

import { CheckCircle2, CircleAlert, ExternalLink, LoaderCircle, LogIn, RefreshCw, Terminal } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

type CodexStatus = {
  connected: boolean
  authMode?: string | null
  planType?: string | null
  modelCount?: number
  error?: string
}

const planNames: Record<string, string> = {
  free: 'Free', plus: 'Plus', pro: 'Pro', team: 'Team', business: 'Business', enterprise: 'Enterprise', edu: 'Edu',
}

export function CodexConnection() {
  const [status, setStatus] = useState<CodexStatus | null>(null)
  const [checking, setChecking] = useState(true)
  const [loginPending, setLoginPending] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [loginUrl, setLoginUrl] = useState('')

  const checkConnection = useCallback(async () => {
    setChecking(true)
    try {
      const response = await fetch('/api/codex/status', { cache: 'no-store' })
      const result = await response.json() as CodexStatus
      setStatus(result)
      if (result.connected) setLoginPending(false)
    } catch {
      setStatus({ connected: false, error: '无法连接 KILLCode 本地服务' })
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => { queueMicrotask(() => { void checkConnection() }) }, [checkConnection])
  useEffect(() => {
    if (!loginPending) return
    const timer = window.setInterval(() => { void checkConnection() }, 2000)
    return () => window.clearInterval(timer)
  }, [checkConnection, loginPending])

  async function startLogin() {
    const popup = window.open('about:blank', 'killcode-codex-login', 'popup,width=560,height=760')
    setLoginPending(true)
    setLoginUrl('')
    try {
      const response = await fetch('/api/codex/login', { method: 'POST' })
      const result = await response.json() as { authUrl?: string; error?: string }
      if (!response.ok || !result.authUrl) throw new Error(result.error || '无法启动登录')
      setLoginUrl(result.authUrl)
      if (popup) popup.location.href = result.authUrl
    } catch (error) {
      popup?.close()
      setLoginPending(false)
      setStatus({ connected: false, error: error instanceof Error ? error.message : '无法启动登录' })
    }
  }

  async function reconnect() {
    setReconnecting(true)
    try {
      const response = await fetch('/api/codex/reconnect', { method: 'POST' })
      const result = await response.json() as CodexStatus
      setStatus(result)
      if (!response.ok || !result.connected) throw new Error(result.error || 'Codex 尚未登录')
      setLoginPending(false)
    } catch (error) {
      setStatus({ connected: false, error: error instanceof Error ? error.message : '无法重新连接 Codex' })
    } finally {
      setReconnecting(false)
    }
  }

  const connected = status?.connected === true
  const planName = status?.planType ? planNames[status.planType] ?? status.planType : null

  return <div className="codex-card">
    <div className="codex-card-heading">
      <div className={`codex-status-icon ${connected ? 'connected' : ''}`}>{checking ? <LoaderCircle className="spin"/> : connected ? <CheckCircle2/> : <CircleAlert/>}</div>
      <div><strong>{checking && !status ? '正在检测 Codex' : connected ? 'Codex 已连接' : 'Codex 需要配置'}</strong><small>{connected ? `${status.authMode === 'chatgpt' ? 'ChatGPT' : status.authMode}${planName ? ` · ${planName}` : ''}${status.modelCount ? ` · ${status.modelCount} 个模型` : ''}` : status?.error || '请安装 Codex CLI 并登录你的账号'}</small></div>
      <button className="icon-button" type="button" aria-label="重新检测 Codex" title="重新检测" disabled={checking} onClick={() => void checkConnection()}><RefreshCw className={checking ? 'spin' : ''}/></button>
    </div>
    {!connected && <div className="codex-setup">
      <ol><li>安装 Codex CLI，并确认终端可以运行 <code>codex</code>。</li><li>点击下方按钮，使用你自己的 ChatGPT 账号完成授权。</li><li>回到这里，连接状态会自动刷新。</li></ol>
      <button className="button" type="button" disabled={reconnecting || checking || loginPending} onClick={() => void reconnect()}>{reconnecting ? <LoaderCircle className="spin"/> : <RefreshCw/>}{reconnecting ? '正在重新连接…' : '重新连接 Codex'}</button>
      <button className="button primary" type="button" disabled={loginPending || reconnecting} onClick={() => void startLogin()}>{loginPending ? <LoaderCircle className="spin"/> : <LogIn/>}{loginPending ? '等待登录完成…' : '使用 ChatGPT 登录'}</button>
      {loginUrl && <a className="codex-login-fallback" href={loginUrl} target="_blank" rel="noreferrer">登录窗口没有打开？点击这里 <ExternalLink/></a>}
    </div>}
    <details className="codex-help"><summary><Terminal/>终端安装与排查</summary><div><p>在 PowerShell 中检查：</p><pre>codex --version{`\n`}codex login status</pre><p>未登录时运行：</p><pre>codex login</pre><a href="https://learn.chatgpt.com/docs/codex/cli" target="_blank" rel="noreferrer">查看 Codex CLI 官方安装说明 <ExternalLink/></a><small>请勿复制或分享个人 Codex 凭据文件。每位使用者应登录自己的账号。</small></div></details>
  </div>
}
