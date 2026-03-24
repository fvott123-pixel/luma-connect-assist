CREATE TABLE public.mobile_upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code TEXT NOT NULL UNIQUE,
  extracted JSONB NOT NULL DEFAULT '{}'::jsonb,
  summaries JSONB NOT NULL DEFAULT '[]'::jsonb,
  doc_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS needed — this is accessed via service role key in the edge function
ALTER TABLE public.mobile_upload_sessions ENABLE ROW LEVEL SECURITY;