import { NextRequest, NextResponse } from 'next/server';
import { deleteRowsByCondition } from '@/lib/sheets';

export async function POST(req: NextRequest) {
  try {
    const adminCode = req.headers.get('x-admin-code');
    if (adminCode !== process.env.ADMIN_CODE) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });
    }

    const body = await req.json();
    const { grade, classNum } = body;

    if (!grade || !classNum) {
      return NextResponse.json({ error: '학년과 반을 지정해주세요.' }, { status: 400 });
    }

    await deleteRowsByCondition(
      '동아리_배정결과',
      (row) => Number(row[0]) === grade && Number(row[1]) === classNum
    );

    return NextResponse.json({ success: true, message: `${grade}학년 ${classNum}반 데이터가 초기화되었습니다.` });
  } catch (err) {
    console.error('[admin/reset] Error:', err);
    return NextResponse.json({ error: '초기화 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
