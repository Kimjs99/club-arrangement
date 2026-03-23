import { NextRequest, NextResponse } from 'next/server';
import { getSheetData, appendRow, deleteRowsByCondition } from '@/lib/sheets';
import { SubmitPayload } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body: SubmitPayload = await req.json();
    const { grade, classNum, teacherName, assignments, overwrite } = body;

    if (!grade || !classNum || !teacherName) {
      return NextResponse.json({ error: '학년, 반, 교사명은 필수입니다.' }, { status: 400 });
    }
    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ error: '배정 데이터가 없습니다.' }, { status: 400 });
    }

    // 중복 제출 확인 (A:학년, B:반)
    const existing = await getSheetData('동아리_배정결과');
    const dataRows = existing.slice(1);
    const hasDuplicate = dataRows.some(
      (row) => Number(row[0]) === grade && Number(row[1]) === classNum
    );

    if (hasDuplicate && !overwrite) {
      return NextResponse.json(
        { error: `${grade}학년 ${classNum}반은 이미 제출되었습니다. 덮어쓰시겠습니까?`, duplicate: true },
        { status: 409 }
      );
    }

    if (hasDuplicate && overwrite) {
      await deleteRowsByCondition(
        '동아리_배정결과',
        (row) => Number(row[0]) === grade && Number(row[1]) === classNum
      );
    }

    // 배정 결과 시트 append (A:학년 B:반 C:번호 D:이름 E:동아리명 F:제출시각)
    const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    for (const a of assignments) {
      await appendRow('동아리_배정결과', [
        a.grade, a.classNum, a.number, a.studentName, a.clubName, now,
      ]);
    }

    // 마스터 학생명단 upsert: 없으면 추가 (A:학년 B:반 C:번호 D:이름)
    const masterRows = await getSheetData('마스터_학생명단');
    const masterData = masterRows.slice(1);
    for (const a of assignments) {
      if (!a.studentName) continue;
      const exists = masterData.some(
        (r) => Number(r[0]) === a.grade && Number(r[1]) === a.classNum && Number(r[2]) === a.number
      );
      if (!exists) {
        await appendRow('마스터_학생명단', [a.grade, a.classNum, a.number, a.studentName]);
        masterData.push([String(a.grade), String(a.classNum), String(a.number), a.studentName]);
      }
    }

    // 제출 기록 append
    const records = await getSheetData('배정_제출기록');
    const recordRows = records.slice(1);
    const existingRecord = recordRows.findIndex(
      (r) => Number(r[1]) === grade && Number(r[2]) === classNum
    );

    const prevCount = existingRecord >= 0 ? parseInt(recordRows[existingRecord][5] ?? '0') : 0;
    await appendRow('배정_제출기록', [
      now, grade, classNum, teacherName, assignments.length, prevCount + 1,
      existingRecord >= 0 ? '재제출' : '최초제출',
    ]);

    return NextResponse.json({ success: true, count: assignments.length });
  } catch (err) {
    console.error('[submit] Error:', err);
    return NextResponse.json({ error: '제출 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
