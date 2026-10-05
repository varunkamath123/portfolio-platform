import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { extractTickers, answerStockQuestion } from '@/lib/mirofish'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '50')
  const offset = parseInt(req.nextUrl.searchParams.get('offset') ?? '0')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (!profile) return NextResponse.json({ questions: [] })

  const { data, error } = await supabase
    .from('questions')
    .select('id, question, tickers, status, created_at')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ questions: data })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const question: string = body.question?.trim()
  if (!question || question.length < 5) {
    return NextResponse.json({ error: 'Question too short' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const tickers: string[] = body.tickers?.length
    ? body.tickers
    : await extractTickers(question)

  const { data: qRow, error: qErr } = await supabase
    .from('questions')
    .insert({ user_id: profile.id, question, tickers, status: 'processing' })
    .select('id')
    .single()

  if (qErr || !qRow) return NextResponse.json({ error: 'Failed to save question' }, { status: 500 })

  try {
    const { answer_md, mirofish } = await answerStockQuestion(question, tickers)

    await supabase.from('answers').insert({
      question_id: qRow.id,
      answer_md,
      mirofish_data: mirofish,
    })

    // Save messages for conversation threading
    await supabase.from('messages').insert([
      { question_id: qRow.id, role: 'user', content: question },
      { question_id: qRow.id, role: 'assistant', content: answer_md, metadata: { mirofish } },
    ])

    await supabase
      .from('questions')
      .update({ status: 'answered' })
      .eq('id', qRow.id)

    return NextResponse.json({ id: qRow.id, answer_md, mirofish, tickers })
  } catch (e) {
    await supabase.from('questions').update({ status: 'failed' }).eq('id', qRow.id)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
