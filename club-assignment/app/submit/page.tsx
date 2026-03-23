'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Club, Student, AssignmentRow } from '@/types';

function studentKey(s: Student) {
  return `${s.grade}-${s.classNum}-${s.number}`;
}

export default function SubmitPage() {
  const router = useRouter();
  const [grade, setGrade] = useState<number | null>(null);
  const [classNum, setClassNum] = useState<number | null>(null);
  const [teacherName, setTeacherName] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkClub, setBulkClub] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [overwriteConfirm, setOverwriteConfirm] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ filled: number; total: number; unknown: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sessionStorage.getItem('auth_submit')) router.push('/');
  }, [router]);

  useEffect(() => {
    fetch('/api/clubs').then((r) => r.json()).then(setClubs);
  }, []);

  useEffect(() => {
    if (!grade || !classNum) return;
    setLoading(true);
    setAssignments({});
    setSelected(new Set());
    setImportResult(null);
    fetch(`/api/students?grade=${grade}&classNum=${classNum}`)
      .then((r) => r.json())
      .then((data) => { setStudents(data); setLoading(false); });
  }, [grade, classNum]);

  const assignedCount = students.filter((s) => assignments[studentKey(s)]).length;
  const unassignedCount = students.length - assignedCount;

  const clubCount = clubs.reduce<Record<string, number>>((acc, c) => {
    acc[c.name] = students.filter((s) => assignments[studentKey(s)] === c.name).length;
    return acc;
  }, {});

  function toggleSelect(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === students.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(students.map(studentKey)));
    }
  }

  function applyBulk() {
    if (!bulkClub || selected.size === 0) return;
    setAssignments((prev) => {
      const next = { ...prev };
      selected.forEach((key) => { next[key] = bulkClub; });
      return next;
    });
    setSelected(new Set());
    setBulkClub('');
  }

  // ── 템플릿 다운로드 ──────────────────────────────────────────────
  async function downloadTemplate() {
    const res = await fetch(`/api/template?grade=${grade}&classNum=${classNum}`);
    if (!res.ok) { alert('템플릿 생성 실패'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${grade}학년${classNum}반_동아리배정_템플릿.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── 파일 파싱 및 배정 적용 ───────────────────────────────────────
  async function handleFile(file: File) {
    if (!file.name.endsWith('.xlsx')) {
      alert('.xlsx 파일만 업로드 가능합니다.');
      return;
    }
    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/parse-template', { method: 'POST', body: formData });
    const data = await res.json();
    setImporting(false);

    if (!res.ok) { alert(`파일 오류: ${data.error}`); return; }

    // 마스터 시트에 학생이 없을 경우 파싱 결과로 학생 목록 구성
    type ParsedAssignment = { number: number; name: string; clubName: string };
    const parsed = data.assignments as ParsedAssignment[];

    let currentStudents = students;
    if (students.length === 0 && grade && classNum) {
      const fromTemplate: Student[] = parsed
        .filter((a) => a.name)
        .map((a) => ({ grade, classNum, number: a.number, name: a.name }));
      if (fromTemplate.length > 0) {
        setStudents(fromTemplate);
        currentStudents = fromTemplate;
      }
    }

    // 파싱 결과를 현재 학생 목록에 매핑
    const validClubNames = new Set(clubs.map((c) => c.name));
    const unknown: string[] = [];
    const newAssignments: Record<string, string> = { ...assignments };
    let applied = 0;

    for (const { number, clubName } of parsed) {
      const student = currentStudents.find((s) => s.number === number);
      if (!student) continue;
      if (!clubName) continue;

      if (!validClubNames.has(clubName)) {
        if (!unknown.includes(clubName)) unknown.push(clubName);
        continue;
      }

      newAssignments[studentKey(student)] = clubName;
      applied++;
    }

    setAssignments(newAssignments);
    setImportResult({ filled: applied, total: data.totalCount, unknown });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── 제출 ────────────────────────────────────────────────────────
  async function doSubmit(overwrite = false) {
    if (!grade || !classNum || !teacherName) return;
    setSubmitting(true);

    const payload = {
      grade, classNum, teacherName, overwrite,
      assignments: students.map((s): AssignmentRow => ({
        studentName: s.name,
        grade: s.grade,
        classNum: s.classNum,
        number: s.number,
        clubName: assignments[studentKey(s)] ?? '',
      })),
    };

    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);
    const data = await res.json();

    if (res.status === 409 && data.duplicate) {
      setConfirmOpen(false);
      setOverwriteConfirm(true);
      return;
    }

    if (res.ok) {
      alert(`제출 완료! ${data.count}명의 배정 데이터가 저장되었습니다.`);
      setConfirmOpen(false);
      setOverwriteConfirm(false);
    } else {
      alert(`오류: ${data.error}`);
    }
  }

  return (
    <div className="min-h-screen p-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-700 text-2xl">←</button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📋 담임교사 동아리 배정 제출</h1>
          <p className="text-gray-500 text-sm">학년·반을 선택하고 학생별 동아리를 지정한 후 제출하세요</p>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
        <h2 className="font-bold text-gray-700 mb-4">기본 정보</h2>
        <div className="flex flex-wrap gap-6">
          <div>
            <label className="block text-sm text-gray-500 mb-2">학년</label>
            <div className="flex gap-2">
              {[1, 2, 3].map((g) => (
                <button key={g} onClick={() => setGrade(g)}
                  className={`w-12 h-12 rounded-xl font-bold text-lg border-2 transition-all ${grade === g ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-400'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-2">반</label>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((c) => (
                <button key={c} onClick={() => setClassNum(c)}
                  className={`w-10 h-10 rounded-xl font-bold border-2 transition-all ${classNum === c ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-400'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-w-40">
            <label className="block text-sm text-gray-500 mb-2">담임교사 이름</label>
            <input
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder="홍길동"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 일괄 입력 (템플릿 다운로드 + 업로드) */}
      {grade && classNum && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <h2 className="font-bold text-gray-700 mb-1">일괄 입력</h2>
          <p className="text-sm text-gray-400 mb-4">템플릿을 내려받아 동아리명을 입력한 뒤 업로드하면 자동 반영됩니다.</p>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {/* 템플릿 다운로드 */}
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-5 py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
            >
              <span>⬇</span> 템플릿 다운로드
            </button>

            {/* 파일 업로드 버튼 */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
            >
              <span>⬆</span> 작성된 파일 업로드
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>

          {/* 드래그 앤 드롭 영역 */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
          >
            {importing ? (
              <p className="text-blue-500 font-medium">파일 분석 중...</p>
            ) : (
              <p className="text-gray-400 text-sm">여기에 .xlsx 파일을 드래그하거나 위 버튼을 클릭하세요</p>
            )}
          </div>

          {/* 업로드 결과 */}
          {importResult && (
            <div className={`mt-3 p-4 rounded-xl text-sm ${importResult.unknown.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
              <p className={`font-medium ${importResult.unknown.length > 0 ? 'text-yellow-700' : 'text-green-700'}`}>
                {importResult.filled}명 배정 자동 입력 완료
                {importResult.filled < importResult.total && ` (미입력 ${importResult.total - importResult.filled}명)`}
              </p>
              {importResult.unknown.length > 0 && (
                <p className="text-yellow-600 mt-1">
                  ⚠ 동아리 목록에 없는 이름: <strong>{importResult.unknown.join(', ')}</strong> — 해당 학생은 수동으로 지정해주세요.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 학생 배정 테이블 */}
      {grade && classNum && students.length === 0 && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-4 text-center">
          <p className="text-blue-700 font-medium mb-1">학생 명단이 아직 없습니다</p>
          <p className="text-blue-500 text-sm">위에서 템플릿을 다운로드한 뒤 이름과 동아리명을 입력하고 업로드하면 자동으로 구성됩니다.</p>
        </div>
      )}

      {grade && classNum && students.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-700">
              {grade}학년 {classNum}반 배정 현황
              <span className="ml-3 text-sm font-normal text-gray-500">전체 {students.length}명</span>
            </h2>
            <div className="flex gap-3 text-sm">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                배정완료 {assignedCount}명
              </span>
              {unassignedCount > 0 && (
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-medium">
                  미배정 {unassignedCount}명
                </span>
              )}
            </div>
          </div>

          {/* 일괄 배정 (체크박스 선택) */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-xl">
              <span className="text-sm text-blue-700 font-medium">{selected.size}명 선택됨</span>
              <select
                value={bulkClub}
                onChange={(e) => setBulkClub(e.target.value)}
                className="flex-1 border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
              >
                <option value="">동아리 선택</option>
                {clubs.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
              <button onClick={applyBulk} disabled={!bulkClub}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-40">
                일괄 적용
              </button>
              <button onClick={() => setSelected(new Set())} className="text-gray-400 text-sm hover:text-gray-600">취소</button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-gray-400">학생 목록 불러오는 중...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left w-10">
                      <input type="checkbox"
                        checked={selected.size === students.length && students.length > 0}
                        onChange={toggleAll}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-2 text-center w-12 text-gray-600">번호</th>
                    <th className="px-3 py-2 text-left text-gray-600">이름</th>
                    <th className="px-3 py-2 text-left text-gray-600">동아리 배정</th>
                    <th className="px-3 py-2 text-center w-16 text-gray-600">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, idx) => {
                    const key = studentKey(s);
                    const assigned = assignments[key];
                    return (
                      <tr key={key} className={`border-t ${idx % 2 === 0 ? '' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={selected.has(key)} onChange={() => toggleSelect(key)}
                            className="w-4 h-4 cursor-pointer" />
                        </td>
                        <td className="px-3 py-2 text-center text-gray-500">{s.number}</td>
                        <td className="px-3 py-2 font-medium text-gray-800">{s.name}</td>
                        <td className="px-3 py-2">
                          <select
                            value={assigned ?? ''}
                            onChange={(e) => setAssignments((prev) => ({ ...prev, [key]: e.target.value }))}
                            className={`w-full border rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 ${assigned ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
                          >
                            <option value="">-- 선택 --</option>
                            {clubs.map((c) => (
                              <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {assigned
                            ? <span className="text-green-500 text-lg">✓</span>
                            : <span className="text-gray-300 text-lg">○</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 동아리별 요약 */}
      {grade && classNum && assignedCount > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <h2 className="font-bold text-gray-700 mb-3">동아리별 배정 현황</h2>
          <div className="flex flex-wrap gap-2">
            {clubs.filter((c) => clubCount[c.name] > 0).map((c) => (
              <span key={c.name} className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {c.name} {clubCount[c.name]}명
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 제출 버튼 */}
      {grade && classNum && students.length > 0 && (
        <div className="sticky bottom-4">
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={!teacherName || submitting}
            className="w-full py-4 bg-blue-600 text-white text-lg font-bold rounded-2xl shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? '제출 중...' : `배정 제출하기 (${students.length}명)`}
            {unassignedCount > 0 && ` ⚠ 미배정 ${unassignedCount}명`}
          </button>
        </div>
      )}

      {/* 제출 확인 모달 */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold mb-2">제출 확인</h3>
            <p className="text-gray-600 mb-2">{grade}학년 {classNum}반 동아리 배정을 제출합니다.</p>
            {unassignedCount > 0 && (
              <p className="text-red-500 text-sm mb-4">⚠ 미배정 학생 {unassignedCount}명이 있습니다.</p>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirmOpen(false)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600">취소</button>
              <button onClick={() => doSubmit(false)} disabled={submitting} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold">제출</button>
            </div>
          </div>
        </div>
      )}

      {/* 덮어쓰기 확인 모달 */}
      {overwriteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold mb-2">이미 제출된 학급</h3>
            <p className="text-gray-600 mb-4">{grade}학년 {classNum}반은 이미 제출되어 있습니다. 기존 데이터를 덮어쓰겠습니까?</p>
            <div className="flex gap-3">
              <button onClick={() => setOverwriteConfirm(false)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600">취소</button>
              <button onClick={() => doSubmit(true)} disabled={submitting} className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold">덮어쓰기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
