import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { extractTickers, answerStockQuestion } from '@/lib/mirofish'

// GET /api/questions â€” community feed
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '20')
  const offset = parseInt(req.nextUrl.searchParams.get('offset') ?? '0')

  const { data, error } = await supabase
    .from('questions')
    .select(`
      id, question, tickers, status, created_at,
      user_profiles ( full_name ),
      answers ( id, answer_md, mirofish_data, created_at )
    `)
    .eq('status', 'answered')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ questions: data })
}

// POST /api/questions â€” submit a new question
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

  // Extract tickers from question (or use user-provided ones)
  const tickers: string[] = body.tickers?.length
    ? body.tickers
    : await extractTickers(question)

  // Save question
  const { data: qRow, error: qErr } = await supabase
    .from('questions')
    .insert({ user_id: profile.id, question, tickers, status: 'processing' })
    .select('id')
    .single()

  if (qErr || !qRow) return NextResponse.json({ error: 'Failed to save question' }, { status: 500 })

  // Run MiroFish analysis (async â€” but we await here for MVP simplicity)
  try {
    const { answer_md, mirofish } = await answerStockQuestion(question, tickers)

    await supabase.from('answers').insert({
      question_id: qRow.id,
      answer_md,
      mirofish_data: mirofish,
    })

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
