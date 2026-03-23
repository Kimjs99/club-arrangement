import { NextRequest, NextResponse } from 'next/server';
import { listBackupSheets, getSheetIdByName, deleteSheetById } from '@/lib/sheets';

export async function GET(req: NextRequest) {
  try {
    const adminCode = req.headers.get('x-admin-code');
    if (adminCode !== process.env.ADMIN_CODE) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });
    }

    const backups = await listBackupSheets();
    return NextResponse.json(backups);
  } catch (err) {
    console.error('[admin/backups GET] Error:', err);
    return NextResponse.json({ error: '백업 목록 조회 실패' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const adminCode = req.headers.get('x-admin-code');
    if (adminCode !== process.env.ADMIN_CODE) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');

    if (!name || !name.startsWith('백업_')) {
      return NextResponse.json({ error: '올바르지 않은 백업 이름입니다.' }, { status: 400 });
    }

    const sheetId = await getSheetIdByName(name);
    if (sheetId === null) {
      return NextResponse.json({ error: '백업 시트를 찾을 수 없습니다.' }, { status: 404 });
    }

    await deleteSheetById(sheetId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/backups DELETE] Error:', err);
    return NextResponse.json({ error: '백업 삭제 실패' }, { status: 500 });
  }
}
