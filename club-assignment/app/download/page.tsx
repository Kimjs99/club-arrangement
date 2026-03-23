'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Club, Student } from '@/types';

export default function DownloadPage() {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Club | null>(null);
  const [preview, setPreview] = useState<Student[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem('auth_download')) router.push('/');
  }, [router]);

  useEffect(() => {
    fetch('/api/clubs').then((r) => r.json()).then(setClubs);
  }, []);

  async function selectClub(club: Club) {
    setSelected(club);
    setLoadingPreview(true);
    const res = await fetch(`/api/preview?clubName=${encodeURIComponent(club.name)}`);
    if (res.ok) setPreview(await res.json());
    setLoadingPreview(false);
  }

  async function download() {
    if (!selected) return;
    setDownloading(true);
    const res = await fetch(`/api/download?clubName=${encodeURIComponent(selected.name)}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selected.name}_출석부.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert('다운로드에 실패했습니다.');
    }
    setDownloading(false);
  }

  const filtered = clubs.filter((c) =>
    c.name.includes(search) || c.teacherName.includes(search)
  );

  return (
    <div className="min-h-screen p-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-700 text-2xl">←</button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📥 동아리 출석부 다운로드</h1>
          <p className="text-gray-500 text-sm">동아리를 선택하고 출석부 XLSX를 다운로드하세요</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* 동아리 목록 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="동아리명 또는 담당교사 검색..."
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 mb-4 focus:outline-none focus:border-green-500"
          />

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <p className="text-center text-gray-400 py-8">검색 결과가 없습니다</p>
            )}
            {filtered.map((club) => (
              <button
                key={club.name}
                onClick={() => selectClub(club)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  selected?.name === club.name
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-100 hover:border-green-300 hover:bg-green-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-800">{club.name}</div>
                    <div className="text-sm text-gray-500 mt-0.5">담당: {club.teacherName}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">{club.currentCount ?? 0}</div>
                    <div className="text-xs text-gray-400">명 배정</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 미리보기 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <div className="text-5xl mb-4">📋</div>
              <p>동아리를 선택하면 명렬이 표시됩니다</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{selected.name}</h2>
                  <p className="text-sm text-gray-500">담당: {selected.teacherName} · {preview.length}명</p>
                </div>
                <button
                  onClick={download}
                  disabled={downloading || preview.length === 0}
                  className="px-5 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {downloading ? '생성 중...' : '📥 XLSX 다운로드'}
                </button>
              </div>

              {loadingPreview ? (
                <div className="text-center py-12 text-gray-400">목록 로딩 중...</div>
              ) : preview.length === 0 ? (
                <div className="text-center py-12 text-gray-400">배정된 학생이 없습니다</div>
              ) : (
                <div className="overflow-auto max-h-[50vh]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-center text-gray-500">번호</th>
                        <th className="px-3 py-2 text-center text-gray-500">학년</th>
                        <th className="px-3 py-2 text-center text-gray-500">반</th>
                        <th className="px-3 py-2 text-left text-gray-500">이름</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((s, idx) => (
                        <tr key={`${s.grade}-${s.classNum}-${s.number}`} className={`border-t ${idx % 2 === 0 ? '' : 'bg-gray-50'}`}>
                          <td className="px-3 py-1.5 text-center text-gray-400">{idx + 1}</td>
                          <td className="px-3 py-1.5 text-center">{s.grade}</td>
                          <td className="px-3 py-1.5 text-center">{s.classNum}</td>
                          <td className="px-3 py-1.5 font-medium">{s.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
