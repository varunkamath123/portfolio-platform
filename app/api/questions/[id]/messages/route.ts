import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { continueConversation } from '@/lib/mirofish'

// GET /api/questions/[id]/messages — fetch thread for a question the current user owns
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Verify ownership
  const { data: question } = await supabase
    .from('questions')
    .select('id, question, tickers')
    .eq('id', id)
    .eq('user_id', profile.id)
    .single()

  if (!question) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch messages
  const { data: messages } = await supabase
    .from('messages')
    .select('id, role, content, metadata, created_at')
    .eq('question_id', id)
    .order('created_at', { ascending: true })

  if (messages && messages.length > 0) {
    return NextResponse.json({ question, messages })
  }

  // Fallback: load from answers table for questions created before messages table existed
  const { data: answer } = await supabase
    .from('answers')
    .select('answer_md, mirofish_data, created_at')
    .eq('question_id', id)
    .single()

  if (answer) {
    const syntheticMessages = [
      { id: `${id}-user`, role: 'user', content: question.question, metadata: null, created_at: answer.created_at },
      { id: `${id}-ai`,   role: 'assistant', content: answer.answer_md, metadata: { mirofish: answer.mirofish_data }, created_at: answer.created_at },
    ]
    return NextResponse.json({ question, messages: syntheticMessages })
  }

  return NextResponse.json({ question, messages: [] })
}

// POST /api/questions/[id]/messages — add a follow-up message to a conversation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const content: string = body.content?.trim()
  const portfolioContext: string | undefined = body.portfolioContext

  if (!content || content.length < 2) {
    return NextResponse.json({ error: 'Message too short' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Verify ownership
  const { data: question } = await supabase
    .from('questions')
    .select('id, question')
    .eq('id', id)
    .eq('user_id', profile.id)
    .single()

  if (!question) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Save user message
  const { data: userMsg, error: saveErr } = await supabase
    .from('messages')
    .insert({ question_id: id, role: 'user', content })
    .select('id, created_at')
    .single()

  if (saveErr || !userMsg) {
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
  }

  // Get conversation history (excluding the message we just saved)
  const { data: prevMessages } = await supabase
    .from('messages')
    .select('id, role, content')
    .eq('question_id', id)
    .order('created_at', { ascending: true })
    .limit(20)

  const history = (prevMessages ?? []).filter(m => m.id !== userMsg.id).map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Get AI response
  const aiContent = await continueConversation(question.question, history, content, undefined, portfolioContext)

  // Save AI response
  const { data: aiMsg } = await supabase
    .from('messages')
    .insert({ question_id: id, role: 'assistant', content: aiContent })
    .select('id, created_at')
    .single()

  return NextResponse.json({
    userMessage:  { id: userMsg.id, role: 'user', content, created_at: userMsg.created_at },
    aiMessage:    { id: aiMsg?.id,  role: 'assistant', content: aiContent, created_at: aiMsg?.created_at },
  })
}
