import { NextRequest, NextResponse } from 'next/server';
import { deleteRowsByCondition } from '@/lib/sheets';

export async function POST(req: NextRequest) {
  try {
    const adminCode = req.headers.get('x-admin-code');
    if (adminCode !== process.env.ADMIN_CODE) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });
    }

    // 세 시트의 데이터 행을 모두 삭제 (헤더 유지)
    await deleteRowsByCondition('동아리_배정결과', () => true);
    await deleteRowsByCondition('배정_제출기록', () => true);
    await deleteRowsByCondition('마스터_학생명단', () => true);

    return NextResponse.json({ success: true, message: '전체 데이터가 삭제되었습니다.' });
  } catch (err) {
    console.error('[admin/reset-all] Error:', err);
    return NextResponse.json({ error: '전체 삭제 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
