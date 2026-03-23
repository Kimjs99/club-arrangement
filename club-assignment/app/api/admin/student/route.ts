import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow } from '@/lib/sheets';

export async function POST(req: NextRequest) {
  try {
    const adminCode = req.headers.get('x-admin-code');
    if (adminCode !== process.env.ADMIN_CODE) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });
    }

    const { grade, classNum, number, name } = await req.json();
    if (!grade || !classNum || !number || !name) {
      return NextResponse.json({ error: '학년, 반, 번호, 이름은 필수입니다.' }, { status: 400 });
    }

    const rows = await getSheetData('마스터_학생명단');
    const exists = rows
      .slice(1)
      .some((r) => Number(r[0]) === grade && Number(r[1]) === classNum && Number(r[2]) === number);

    if (exists) {
      return NextResponse.json({ error: '이미 존재하는 학생입니다. (같은 학년/반/번호)' }, { status: 409 });
    }

    await appendRow('마스터_학생명단', [grade, classNum, number, name]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/student] Error:', err);
    return NextResponse.json({ error: '학생 추가 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
