import ExcelJS from 'exceljs';
import { AttendanceSheet } from '@/types';

interface AttendanceOptions {
  attendanceCols?: number;
  includeSignatureRow?: boolean;
  sortBy?: 'grade' | 'name';
}

export async function generateAttendanceSheet(
  data: AttendanceSheet,
  options: AttendanceOptions = {}
): Promise<Buffer> {
  const { attendanceCols = 20, includeSignatureRow = false, sortBy = 'grade' } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = '동아리 배정 관리 시스템';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`${data.club.name} 출석부`);

  // 월 라벨 생성 (3월~2월, 학기 기준 20회)
  const monthLabels: string[] = [];
  for (let m = 3; m <= 12; m++) monthLabels.push(`${m}월`);
  for (let m = 1; m <= 2; m++) monthLabels.push(`${m}월`);
  const colLabels = monthLabels.slice(0, attendanceCols);

  const totalCols = 4 + attendanceCols; // 번호, 학년, 반, 이름 + 출석열

  // 컬럼 너비 설정
  sheet.getColumn(1).width = 6;   // 번호
  sheet.getColumn(2).width = 6;   // 학년
  sheet.getColumn(3).width = 6;   // 반
  sheet.getColumn(4).width = 14;  // 이름
  for (let i = 5; i <= totalCols; i++) {
    sheet.getColumn(i).width = 7;
  }

  // 행 1: 제목
  const titleRow = sheet.addRow([`${data.club.name} 출석부`]);
  sheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = sheet.getCell('A1');
  titleCell.font = { size: 18, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  titleCell.font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  titleRow.height = 40;

  // 행 2: 담당교사 / 작성일
  const infoRow = sheet.addRow([
    `담당교사: ${data.club.teacherName}`,
    '', '',
    `작성일: ${new Date().toLocaleDateString('ko-KR')}`,
    ...Array(attendanceCols - 1).fill(''),
  ]);
  sheet.mergeCells(2, 1, 2, 3);
  sheet.mergeCells(2, 4, 2, totalCols);
  infoRow.getCell(1).font = { size: 11, bold: true };
  infoRow.getCell(4).font = { size: 11 };
  infoRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  infoRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
  infoRow.height = 24;

  // 행 3: 통계
  const assignedCount = data.students.length;
  const statsRow = sheet.addRow([`총 배정인원: ${assignedCount}명`, ...Array(totalCols - 1).fill('')]);
  sheet.mergeCells(3, 1, 3, totalCols);
  statsRow.getCell(1).font = { size: 10, color: { argb: 'FF555555' } };
  statsRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
  statsRow.height = 20;

  // 행 4: 헤더
  const headerRow = sheet.addRow(['번호', '학년', '반', '이름', ...colLabels]);
  headerRow.height = 22;
  for (let col = 1; col <= totalCols; col++) {
    const cell = headerRow.getCell(col);
    cell.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
  }

  // 학생 정렬
  const sorted = [...data.students].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name, 'ko');
    return a.grade - b.grade || a.classNum - b.classNum || a.number - b.number;
  });

  // 행 5~: 학생 데이터
  sorted.forEach((student, idx) => {
    const rowNum = idx + 5;
    const isEven = idx % 2 === 1;
    const bgColor = isEven ? 'FFF5F9FC' : 'FFFFFFFF';

    const row = sheet.addRow([
      idx + 1, student.grade, student.classNum, student.name,
      ...Array(attendanceCols).fill(''),
    ]);
    row.height = 20;

    for (let col = 1; col <= totalCols; col++) {
      const cell = row.getCell(col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
      // 이름 열 왼쪽 정렬
      if (col === 4) cell.alignment = { horizontal: 'left', vertical: 'middle' };
      cell.font = { size: 10 };
    }

    // 번호 열 굵게
    row.getCell(1).font = { size: 10, bold: true };
  });

  // 서명란 (옵션)
  if (includeSignatureRow) {
    sheet.addRow([]);
    const sigRow = sheet.addRow(['', '', '담당교사 확인', ...Array(totalCols - 3).fill('')]);
    sheet.mergeCells(sigRow.number, 3, sigRow.number, 7);
    sigRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    sigRow.getCell(4).border = {
      top: { style: 'medium' }, bottom: { style: 'medium' },
      left: { style: 'medium' }, right: { style: 'medium' },
    };
    sigRow.height = 40;
  }

  // 행 1 높이는 이미 설정됨, 인쇄 설정
  sheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9, // A4
  };

  // Buffer 반환
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
