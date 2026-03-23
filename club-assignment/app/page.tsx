'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Role = 'submit' | 'download' | 'admin';

interface ModalState {
  role: Role;
  code: string;
  error: string;
}

const ROLE_CONFIG: Record<Role, { label: string; desc: string; path: string; color: string; icon: string }> = {
  submit: {
    label: '담임교사 배정 제출',
    desc: '학급 학생들의 동아리 배정 결과를 입력하고 제출합니다.',
    path: '/submit',
    color: 'bg-blue-600 hover:bg-blue-700',
    icon: '📋',
  },
  download: {
    label: '동아리 담당교사',
    desc: '동아리 출석부 및 명렬표를 XLSX로 다운로드합니다.',
    path: '/download',
    color: 'bg-green-600 hover:bg-green-700',
    icon: '📥',
  },
  admin: {
    label: '관리자 현황판',
    desc: '전체 배정 현황을 확인하고 데이터를 관리합니다.',
    path: '/admin',
    color: 'bg-purple-600 hover:bg-purple-700',
    icon: '📊',
  },
};

const MANUAL: Record<Role, { title: string; steps: { title: string; detail: string }[] }> = {
  submit: {
    title: '담임교사 사용 방법',
    steps: [
      { title: '접속', detail: '담임교사 배정 제출을 선택하고 접근 코드를 입력합니다.' },
      { title: '학급 선택', detail: '학년·반을 선택하고 담임교사 이름을 입력합니다.' },
      {
        title: '방법 A — 템플릿 사용 (권장)',
        detail: '템플릿 다운로드 → Excel에서 학생 이름과 동아리명(드롭다운) 입력 → 파일 업로드 → 자동 반영',
      },
      {
        title: '방법 B — 화면에서 직접 입력',
        detail: '학생별 드롭다운으로 동아리 선택, 또는 여러 학생을 체크한 뒤 일괄 배정',
      },
      { title: '제출', detail: '배정 제출하기 버튼을 클릭하면 완료됩니다. 재제출 시 덮어쓰기 가능합니다.' },
    ],
  },
  download: {
    title: '동아리 담당교사 사용 방법',
    steps: [
      { title: '접속', detail: '동아리 담당교사를 선택하고 접근 코드를 입력합니다.' },
      { title: '동아리 선택', detail: '검색창에서 담당 동아리를 검색하거나 목록에서 선택합니다.' },
      { title: '명단 확인', detail: '오른쪽 화면에서 배정된 학생 명단을 미리볼 수 있습니다.' },
      { title: '출석부 다운로드', detail: 'XLSX 다운로드 버튼을 클릭하면 차시별 출석부 파일이 저장됩니다.' },
    ],
  },
  admin: {
    title: '관리자 사용 방법',
    steps: [
      { title: '접속', detail: '관리자 현황판을 선택하고 접근 코드를 입력합니다.' },
      {
        title: '현황판 탭',
        detail: '전체 배정률, 미제출·제출 완료 학급 목록, 동아리별 배정 인원, 최근 제출 기록을 확인합니다.',
      },
      {
        title: '학생/배정 관리 탭',
        detail: '학급 선택 후 학생 추가(전학생 등록) 또는 개별 동아리 배정 변경이 가능합니다. 변경 시 2단계 확인이 필요합니다.',
      },
      {
        title: '동아리 명단 탭',
        detail: '동아리를 선택하여 배정된 학생 목록을 확인하고 출석부를 다운로드합니다.',
      },
      {
        title: '학년도 초기화',
        detail: '학년도 변경 시 상단 전체 데이터 삭제 버튼을 사용합니다. 전체삭제확인 문구를 직접 입력해야 실행됩니다.',
      },
    ],
  },
};

export default function Home() {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualTab, setManualTab] = useState<Role>('submit');

  function openModal(role: Role) {
    setModal({ role, code: '', error: '' });
  }

  async function handleEnter() {
    if (!modal) return;
    setLoading(true);

    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: modal.role, code: modal.code }),
    });

    setLoading(false);
    if (res.ok) {
      sessionStorage.setItem(`auth_${modal.role}`, modal.code);
      router.push(ROLE_CONFIG[modal.role].path);
    } else {
      setModal((m) => m ? { ...m, error: '코드가 올바르지 않습니다.' } : null);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-900 text-4xl mb-4 shadow-lg">
            🏫
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">화접중학교 창체동아리 배정 관리 시스템</h1>
          <p className="text-gray-500">역할을 선택하고 접근 코드를 입력하세요</p>
        </div>

        <div className="grid gap-4">
          {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([role, cfg]) => (
            <button
              key={role}
              onClick={() => openModal(role)}
              className={`${cfg.color} text-white rounded-2xl p-6 text-left shadow-md transition-all transform hover:-translate-y-0.5 hover:shadow-lg`}
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">{cfg.icon}</span>
                <div>
                  <div className="text-xl font-bold">{cfg.label}</div>
                  <div className="text-sm opacity-80 mt-1">{cfg.desc}</div>
                </div>
                <span className="ml-auto text-2xl opacity-60">→</span>
              </div>
            </button>
          ))}
        </div>

        {/* 역할별 사용 매뉴얼 */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-3 border-b border-gray-100">
            <h2 className="font-bold text-gray-700 text-sm">📖 사용 방법</h2>
          </div>

          {/* 탭 */}
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([role, cfg]) => (
              <button
                key={role}
                onClick={() => setManualTab(role)}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  manualTab === role
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {cfg.icon} {cfg.label}
              </button>
            ))}
          </div>

          {/* 매뉴얼 내용 */}
          <div className="p-6">
            <ol className="space-y-3">
              {MANUAL[manualTab].steps.map((step, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-medium text-gray-800 text-sm">{step.title}</span>
                    <p className="text-gray-500 text-sm mt-0.5">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              {ROLE_CONFIG[modal.role].icon} {ROLE_CONFIG[modal.role].label}
            </h2>
            <p className="text-gray-500 text-sm mb-6">접근 코드를 입력하세요</p>

            <input
              type="password"
              value={modal.code}
              onChange={(e) => setModal((m) => m ? { ...m, code: e.target.value, error: '' } : null)}
              onKeyDown={(e) => e.key === 'Enter' && handleEnter()}
              placeholder="접근 코드"
              autoFocus
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-blue-500 mb-2"
            />
            {modal.error && <p className="text-red-500 text-sm mb-3">{modal.error}</p>}

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleEnter}
                disabled={loading || !modal.code}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '확인 중...' : '입장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
