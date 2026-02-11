'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  AreaChart, Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AnalysisResult, AnalysisProgress } from '@/lib/image-analysis/types';

interface AnalysisLiveChartProps {
  results: Map<string, AnalysisResult>;
  progress: AnalysisProgress;
  totalImages: number;
}

const ISSUE_COLORS: Record<string, string> = {
  clean: '#22c55e',
  eyes_closed: '#e11d48',
  negative_expression: '#f97316',
  mouth_open: '#06b6d4',
  gaze_away: '#6366f1',
  blurry: '#a855f7',
  poor_lighting: '#f59e0b',
};

const ISSUE_LABELS: Record<string, string> = {
  clean: '정상',
  eyes_closed: '눈감음',
  negative_expression: '찡그림',
  mouth_open: '입벌림',
  gaze_away: '시선이탈',
  blurry: '초점불량',
  poor_lighting: '조도불량',
};

export function AnalysisLiveChart({ results, progress, totalImages }: AnalysisLiveChartProps) {
  const allResults = useMemo(() => Array.from(results.values()), [results]);
  const analyzed = allResults.length;

  // 이슈별 카운트
  const issueCounts = useMemo(() => {
    let eyesClosed = 0, negativeExpression = 0, mouthOpen = 0, gazeAway = 0, blurry = 0, poorLighting = 0, clean = 0;
    for (const r of allResults) {
      if (r.issues.includes('eyes_closed')) eyesClosed++;
      if (r.issues.includes('negative_expression')) negativeExpression++;
      if (r.issues.includes('mouth_open')) mouthOpen++;
      if (r.issues.includes('gaze_away')) gazeAway++;
      if (r.issues.includes('blurry')) blurry++;
      if (r.issues.includes('poor_lighting')) poorLighting++;
      if (r.issues.length === 0) clean++;
    }
    return { eyesClosed, negativeExpression, mouthOpen, gazeAway, blurry, poorLighting, clean };
  }, [allResults]);

  // 바 차트 데이터
  const barData = useMemo(() => [
    { name: '정상', value: issueCounts.clean, key: 'clean' },
    { name: '눈감음', value: issueCounts.eyesClosed, key: 'eyes_closed' },
    { name: '찡그림', value: issueCounts.negativeExpression, key: 'negative_expression' },
    { name: '입벌림', value: issueCounts.mouthOpen, key: 'mouth_open' },
    { name: '시선이탈', value: issueCounts.gazeAway, key: 'gaze_away' },
    { name: '초점불량', value: issueCounts.blurry, key: 'blurry' },
    { name: '조도불량', value: issueCounts.poorLighting, key: 'poor_lighting' },
  ], [issueCounts]);

  // 파이 차트 데이터 (0이 아닌 것만)
  const pieData = useMemo(() => {
    const items = [
      { name: '정상', value: issueCounts.clean, key: 'clean' },
      { name: '눈감음', value: issueCounts.eyesClosed, key: 'eyes_closed' },
      { name: '찡그림', value: issueCounts.negativeExpression, key: 'negative_expression' },
      { name: '입벌림', value: issueCounts.mouthOpen, key: 'mouth_open' },
      { name: '시선이탈', value: issueCounts.gazeAway, key: 'gaze_away' },
      { name: '초점불량', value: issueCounts.blurry, key: 'blurry' },
      { name: '조도불량', value: issueCounts.poorLighting, key: 'poor_lighting' },
    ];
    return items.filter(i => i.value > 0);
  }, [issueCounts]);

  // 처리 속도 영역 차트 데이터 (최근 결과 누적)
  const areaData = useMemo(() => {
    if (allResults.length === 0) return [];
    // 10개 단위로 누적 통계
    const step = Math.max(1, Math.floor(allResults.length / 20));
    const points: { idx: number; clean: number; issue: number }[] = [];
    let cleanCount = 0;
    let issueCount = 0;
    for (let i = 0; i < allResults.length; i++) {
      if (allResults[i].issues.length === 0) cleanCount++;
      else issueCount++;
      if ((i + 1) % step === 0 || i === allResults.length - 1) {
        points.push({ idx: i + 1, clean: cleanCount, issue: issueCount });
      }
    }
    return points;
  }, [allResults]);

  const problemRate = analyzed > 0 ? ((analyzed - issueCounts.clean) / analyzed * 100).toFixed(1) : '0';

  if (analyzed === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32 text-slate-400">
            <div className="text-center">
              <div className="text-4xl mb-2 animate-pulse">...</div>
              <p className="text-sm">분석 결과를 기다리는 중</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* 실시간 통계 카드 */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-slate-500">분석 완료</p>
            <p className="text-2xl font-bold text-blue-600">
              {analyzed}
              <span className="text-sm font-normal text-slate-400">/{totalImages}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-slate-500">정상</p>
            <p className="text-2xl font-bold text-green-600">{issueCounts.clean}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-slate-500">문제 비율</p>
            <p className={`text-2xl font-bold ${Number(problemRate) > 20 ? 'text-red-600' : 'text-amber-600'}`}>
              {problemRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 차트 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* 이슈별 바 차트 */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              이슈별 분포
              <Badge variant="outline" className="text-[10px] font-normal animate-pulse">LIVE</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(value) => [`${value}장`, '수량']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={300}>
                  {barData.map((entry) => (
                    <Cell key={entry.key} fill={ISSUE_COLORS[entry.key]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 정상/문제 파이 차트 */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              구성 비율
              <Badge variant="outline" className="text-[10px] font-normal animate-pulse">LIVE</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={65}
                  dataKey="value"
                  animationDuration={300}
                  label={((props: Record<string, unknown>) => `${props.name} ${((props.percent as number) * 100).toFixed(0)}%`) as unknown as boolean}
                  labelLine={false}
                  style={{ fontSize: 10 }}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.key} fill={ISSUE_COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(value) => [`${value}장`, '수량']}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 누적 추이 차트 */}
      {areaData.length > 2 && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              분석 진행 추이
              <Badge variant="outline" className="text-[10px] font-normal animate-pulse">LIVE</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={areaData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="idx" tick={{ fontSize: 10 }} label={{ value: '분석 장수', position: 'insideBottomRight', offset: -5, fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(value, name) => [
                    `${value}장`,
                    name === 'clean' ? '정상' : '문제',
                  ]}
                />
                <Area type="monotone" dataKey="clean" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.4} animationDuration={300} />
                <Area type="monotone" dataKey="issue" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.4} animationDuration={300} />
                <Legend formatter={(v) => v === 'clean' ? '정상' : '문제'} iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
