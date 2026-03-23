import { NextRequest, NextResponse } from 'next/server';

const CODE_MAP: Record<string, string | undefined> = {
  submit: process.env.SUBMIT_CODE,
  download: process.env.DOWNLOAD_CODE,
  admin: process.env.ADMIN_CODE,
};

export async function POST(req: NextRequest) {
  const { role, code } = await req.json();
  const expected = CODE_MAP[role];

  if (!expected || code !== expected) {
    return NextResponse.json({ error: '코드가 올바르지 않습니다.' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
