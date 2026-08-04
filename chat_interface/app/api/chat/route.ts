import { NextRequest, NextResponse } from 'next/server'

const OPENHANDS_AGENT_URL = process.env.OPENHANDS_AGENT_URL || 'http://127.0.0.1:8001/run'
const OPENHANDS_AGENT_HEALTH_URL = OPENHANDS_AGENT_URL.replace(/\/run$/, '/health')

interface AgentServiceResponse {
  status?: string
  message?: string
  workspace?: string
  detail?: string
  metadata?: {
    files?: string[]
    artifacts?: unknown[]
    tool_calls?: unknown[]
  }
}

export async function GET() {
  try {
    const healthResponse = await fetch(OPENHANDS_AGENT_HEALTH_URL)
    const healthBody = await healthResponse.text()

    if (!healthResponse.ok) {
      return NextResponse.json(
        { connected: false, status: 'error', detail: healthBody || 'Agent health check failed' },
        { status: 503 }
      )
    }

    return NextResponse.json({
      connected: true,
      status: 'ok',
      agent: 'openhands',
      raw: healthBody
    })
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        status: 'error',
        detail: error instanceof Error ? error.message : 'Agent health check failed'
      },
      { status: 503 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 }
      )
    }

    console.log('Forwarding prompt to OpenHands agent service:', prompt)

    const agentResponse = await fetch(OPENHANDS_AGENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    })

    const responseText = await agentResponse.text()
    let data: AgentServiceResponse | null = null

    try {
      data = responseText ? JSON.parse(responseText) : null
    } catch {
      data = null
    }

    if (!agentResponse.ok) {
      const detail = data?.detail || data?.message || 'OpenHands agent service returned an error'
      console.error('OpenHands agent service error:', detail)
      return NextResponse.json(
        { error: detail, status: 'error' },
        { status: agentResponse.status || 502 }
      )
    }

    return NextResponse.json({
      message: data?.message || 'OpenHands conversation completed successfully.',
      metadata: data?.metadata || {
        files: [],
        artifacts: [],
        tool_calls: []
      },
      status: data?.status || 'success',
      agent_id: 'openhands-agent',
      session_id: `session-${Date.now()}`,
      workspace: data?.workspace || process.cwd()
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        status: 'error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  return NextResponse.json(
    { message: 'OpenHands agent service endpoint is stateless for this request' },
    { status: 200 }
  )
}