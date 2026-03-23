import { NextRequest, NextResponse } from 'next/server';
import { getSheetData } from '@/lib/sheets';
import ExcelJS from 'exceljs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const grade = Number(searchParams.get('grade'));
    const classNum = Number(searchParams.get('classNum'));

    if (!grade || !classNum) {
      return NextResponse.json({ error: 'grade, classNum 필요' }, { status: 400 });
    }

    const [studentRows, clubRows] = await Promise.all([
      getSheetData('마스터_학생명단'),
      getSheetData('동아리_목록'),
    ]);

    // A:학년 B:반 C:번호 D:이름
    const students = studentRows
      .slice(1)
      .filter((r) => Number(r[0]) === grade && Number(r[1]) === classNum)
      .map((r) => ({ number: parseInt(r[2]), name: r[3] ?? '' }))
      .sort((a, b) => a.number - b.number);

    const clubNames = clubRows.slice(1).filter((r) => r[0]).map((r) => r[0]);

    if (students.length === 0) {
      return NextResponse.json({ error: '해당 학급 학생이 없습니다.' }, { status: 404 });
    }

    const workbook = new ExcelJS.Workbook();

    // ── 시트 1: 배정 입력 ──────────────────────────────────────────
    const inputSheet = workbook.addWorksheet('배정입력');

    // 제목
    inputSheet.mergeCells('A1:C1');
    const titleCell = inputSheet.getCell('A1');
    titleCell.value = `${grade}학년 ${classNum}반 동아리 배정 입력`;
    titleCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    inputSheet.getRow(1).height = 36;

    // 안내
    inputSheet.mergeCells('A2:C2');
    const guideCell = inputSheet.getCell('A2');
    guideCell.value = '※ C열(동아리명)에만 입력하세요. A열·B열은 수정하지 마세요.';
    guideCell.font = { size: 9, italic: true, color: { argb: 'FF888888' } };
    guideCell.alignment = { horizontal: 'center' };

    // 헤더
    const headerRow = inputSheet.addRow(['번호', '이름', '동아리명']);
    headerRow.height = 24;
    ['A', 'B', 'C'].forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.font = { bold: true, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF2D5A8E' } },
      };
    });

    // 학생 행
    students.forEach((s, idx) => {
      const row = inputSheet.addRow([s.number, s.name, '']);
      row.height = 22;

      const bgColor = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF5F9FC';

      // 번호 셀
      const numCell = row.getCell(1);
      numCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF4' } };
      numCell.alignment = { horizontal: 'center' };
      numCell.font = { size: 10, color: { argb: 'FF555555' } };

      // 이름 셀
      const nameCell = row.getCell(2);
      nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF4' } };
      nameCell.font = { size: 10, bold: true };
      nameCell.alignment = { horizontal: 'left' };

      // 동아리명 셀 (입력 대상)
      const clubCell = row.getCell(3);
      clubCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      clubCell.font = { size: 10 };
      clubCell.alignment = { horizontal: 'left' };

      // 드롭다운 유효성 검사
      if (clubNames.length > 0) {
        clubCell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`"${clubNames.join(',')}"`],
          showErrorMessage: true,
          errorTitle: '입력 오류',
          error: '목록에 있는 동아리명을 선택하세요.',
        };
      }

      // 테두리
      [numCell, nameCell, clubCell].forEach((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        };
      });
    });

    // 열 너비
    inputSheet.getColumn(1).width = 8;
    inputSheet.getColumn(2).width = 14;
    inputSheet.getColumn(3).width = 20;

    // ── 시트 2: 동아리 목록 참고 ──────────────────────────────────
    const refSheet = workbook.addWorksheet('동아리목록_참고');
    refSheet.addRow(['동아리명', '담당교사']);
    refSheet.getRow(1).font = { bold: true };
    refSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD966' } };
    clubRows.slice(1).filter((r) => r[0]).forEach((r) => refSheet.addRow([r[0], r[1] ?? '']));
    refSheet.getColumn(1).width = 20;
    refSheet.getColumn(2).width = 14;

    // ── 반환 ──────────────────────────────────────────────────────
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = encodeURIComponent(`${grade}학년${classNum}반_동아리배정_템플릿.xlsx`);

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${fileName}`,
      },
    });
  } catch (err) {
    console.error('[template] Error:', err);
    return NextResponse.json({ error: '템플릿 생성 실패' }, { status: 500 });
  }
}
