'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  FolderOpen,
  RefreshCw,
  Play,
  AlertTriangle,
  FileText,
  X,
  Upload,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ToolGuide } from './tool-guide';
import { ToolUsageCounter } from './tool-usage-counter';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface FileEntry {
  name: string;
  handle: FileSystemFileHandle;
  selected: boolean;
}

interface RenameRules {
  findReplace: {
    enabled: boolean;
    find: string;
    replace: string;
    caseSensitive: boolean;
    useRegex: boolean;
  };
  caseConvert: {
    enabled: boolean;
    type: 'upper' | 'lower';
  };
  textAdd: {
    enabled: boolean;
    position: 'prefix' | 'suffix';
    text: string;
  };
  numberAdd: {
    enabled: boolean;
    position: 'prefix' | 'suffix';
    startNum: number;
    digits: number;
    separator: 'none' | '_' | '-' | '.';
  };
  extChange: {
    enabled: boolean;
    newExt: string;
  };
}

const DEFAULT_RULES: RenameRules = {
  findReplace: { enabled: false, find: '', replace: '', caseSensitive: false, useRegex: false },
  caseConvert: { enabled: false, type: 'lower' },
  textAdd: { enabled: false, position: 'prefix', text: '' },
  numberAdd: { enabled: false, position: 'suffix', startNum: 1, digits: 3, separator: 'none' },
  extChange: { enabled: false, newExt: 'jpg' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function splitExt(name: string): [string, string] {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? [name.slice(0, dot), name.slice(dot + 1)] : [name, ''];
}

function escRx(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyRules(name: string, seqIdx: number, rules: RenameRules): string {
  let [base, ext] = splitExt(name);

  // 1. Find & Replace (on base name)
  if (rules.findReplace.enabled && rules.findReplace.find) {
    try {
      const flags = rules.findReplace.caseSensitive ? 'g' : 'gi';
      const pattern = rules.findReplace.useRegex
        ? new RegExp(rules.findReplace.find, flags)
        : new RegExp(escRx(rules.findReplace.find), flags);
      base = base.replace(pattern, rules.findReplace.replace);
    } catch { /* invalid regex — skip */ }
  }

  // 2. Case conversion
  if (rules.caseConvert.enabled) {
    base = rules.caseConvert.type === 'upper' ? base.toUpperCase() : base.toLowerCase();
  }

  // 3. Text addition
  if (rules.textAdd.enabled && rules.textAdd.text) {
    base = rules.textAdd.position === 'prefix'
      ? rules.textAdd.text + base
      : base + rules.textAdd.text;
  }

  // 4. Number addition
  if (rules.numberAdd.enabled) {
    const num = String(rules.numberAdd.startNum + seqIdx).padStart(rules.numberAdd.digits, '0');
    const sep = rules.numberAdd.separator === 'none' ? '' : rules.numberAdd.separator;
    base = rules.numberAdd.position === 'prefix'
      ? num + sep + base
      : base + sep + num;
  }

  // 5. Extension change
  if (rules.extChange.enabled && rules.extChange.newExt) {
    ext = rules.extChange.newExt.replace(/^\./, '').toLowerCase();
  }

  return ext ? `${base}.${ext}` : base;
}

// ─────────────────────────────────────────────────────────────────────────────
// FileRenameTool
// ─────────────────────────────────────────────────────────────────────────────

export function FileRenameTool() {
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [rules, setRules] = useState<RenameRules>(DEFAULT_RULES);
  const [processing, setProcessing] = useState(false);
  const [extFilter, setExtFilter] = useState<Set<string>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);
  const trackUseRef = useRef<(() => void) | null>(null);

  const isSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  // ── Derived ─────────────────────────────────────────────────────────────────

  const availableExts = useMemo(() => {
    const s = new Set<string>();
    files.forEach(f => { const [, e] = splitExt(f.name); if (e) s.add(e.toLowerCase()); });
    return [...s].sort();
  }, [files]);

  const visibleFiles = useMemo(() => {
    if (!extFilter.size) return files;
    return files.filter(f => {
      const [, e] = splitExt(f.name);
      return extFilter.has(e.toLowerCase());
    });
  }, [files, extFilter]);

  // Map: originalName → newName (only for visible+selected files)
  const newNameMap = useMemo(() => {
    const map = new Map<string, string>();
    let seq = 0;
    visibleFiles.forEach(f => {
      if (f.selected) {
        map.set(f.name, applyRules(f.name, seq, rules));
        seq++;
      }
    });
    return map;
  }, [visibleFiles, rules]);

  // Detect duplicate new names
  const conflictSet = useMemo(() => {
    const counts = new Map<string, number>();
    newNameMap.forEach(n => counts.set(n, (counts.get(n) ?? 0) + 1));
    const s = new Set<string>();
    counts.forEach((c, n) => { if (c > 1) s.add(n); });
    return s;
  }, [newNameMap]);

  const selectedCount = useMemo(() => visibleFiles.filter(f => f.selected).length, [visibleFiles]);

  const changedCount = useMemo(() => {
    let n = 0;
    newNameMap.forEach((newName, orig) => { if (newName !== orig) n++; });
    return n;
  }, [newNameMap]);

  const allSelected = visibleFiles.length > 0 && visibleFiles.every(f => f.selected);

  // ── File loading ─────────────────────────────────────────────────────────────

  const loadFiles = useCallback(async (handle: FileSystemDirectoryHandle) => {
    const items: FileEntry[] = [];
    for await (const [name, entry] of (handle as any).entries()) {
      if ((entry as FileSystemHandle).kind === 'file') {
        items.push({ name, handle: entry as FileSystemFileHandle, selected: true });
      }
    }
    items.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    setFiles(items);
    return items;
  }, []);

  const handlePickFolder = useCallback(async () => {
    if (!isSupported) {
      toast.error('이 기능은 Chrome 또는 Edge 브라우저에서만 지원됩니다.');
      return;
    }
    try {
      const handle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      setDirHandle(handle);
      setExtFilter(new Set());
      const items = await loadFiles(handle);
      toast.success(`"${handle.name}" 폴더 로드 완료 · ${items.length}개 파일`);
    } catch { /* user cancelled */ }
  }, [isSupported, loadFiles]);

  const handleRefresh = useCallback(async () => {
    if (!dirHandle) return;
    const items = await loadFiles(dirHandle);
    toast.success(`새로고침 완료 · ${items.length}개 파일`);
  }, [dirHandle, loadFiles]);

  // ── Drag & Drop ──────────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (!isSupported) {
      toast.error('Chrome / Edge 브라우저에서만 지원됩니다.');
      return;
    }

    const item = e.dataTransfer.items[0];
    if (!item || !('getAsFileSystemHandle' in item)) {
      toast.error('이 브라우저는 드래그 앤 드롭을 지원하지 않습니다. 폴더 선택 버튼을 이용해주세요.');
      return;
    }

    try {
      const handle = await (item as any).getAsFileSystemHandle() as FileSystemHandle;
      if (handle.kind !== 'directory') {
        toast.error('폴더를 드래그하세요. 개별 파일은 지원되지 않습니다.');
        return;
      }

      const dirH = handle as FileSystemDirectoryHandle;

      // 쓰기 권한 요청
      const perm = await (dirH as any).requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        toast.error('쓰기 권한이 필요합니다. 폴더 선택 버튼을 이용해주세요.');
        return;
      }

      setDirHandle(dirH);
      setExtFilter(new Set());
      const items = await loadFiles(dirH);
      toast.success(`"${dirH.name}" 폴더 로드 완료 · ${items.length}개 파일`);
    } catch {
      toast.error('폴더를 불러오는 중 오류가 발생했습니다.');
    }
  }, [isSupported, loadFiles]);

  // ── Selection ────────────────────────────────────────────────────────────────

  const toggleAll = useCallback((checked: boolean) => {
    setFiles(prev => prev.map(f => ({ ...f, selected: checked })));
  }, []);

  const toggleOne = useCallback((name: string, checked: boolean) => {
    setFiles(prev => prev.map(f => f.name === name ? { ...f, selected: checked } : f));
  }, []);

  // ── Extension filter toggle ───────────────────────────────────────────────────

  const toggleExt = useCallback((ext: string) => {
    setExtFilter(prev => {
      const next = new Set(prev);
      if (next.has(ext)) next.delete(ext); else next.add(ext);
      return next;
    });
  }, []);

  // ── Rule updater ─────────────────────────────────────────────────────────────

  function updateRule<K extends keyof RenameRules>(key: K, patch: Partial<RenameRules[K]>) {
    setRules(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  // ── Rename execution ─────────────────────────────────────────────────────────

  const handleRename = useCallback(async () => {
    if (!dirHandle) return;
    if (conflictSet.size > 0) {
      toast.error('새 파일명에 중복이 있습니다. 규칙을 수정 후 다시 시도하세요.');
      return;
    }
    const toRename = visibleFiles.filter(
      f => f.selected && newNameMap.has(f.name) && newNameMap.get(f.name) !== f.name,
    );
    if (toRename.length === 0) { toast.info('변경할 파일이 없습니다.'); return; }

    setProcessing(true);
    let success = 0;
    let failed = 0;
    try {
      for (const file of toRename) {
        const newName = newNameMap.get(file.name)!;
        try {
          const fileData = await file.handle.getFile();
          const buffer = await fileData.arrayBuffer();
          const newHandle = await (dirHandle as any).getFileHandle(newName, { create: true });
          const writable = await (newHandle as any).createWritable();
          await writable.write(buffer);
          await writable.close();
          await (dirHandle as any).removeEntry(file.name);
          success++;
        } catch (err) {
          console.error(`rename failed: ${file.name}`, err);
          failed++;
        }
      }
      if (success > 0) {
        const msg = failed > 0
          ? `${success}개 변경 완료 (${failed}개 실패)`
          : `${success}개 파일명 변경 완료`;
        toast.success(msg);
        trackUseRef.current?.();
        await loadFiles(dirHandle);
      } else {
        toast.error(`파일명 변경 실패 (${failed}개)`);
      }
    } finally {
      setProcessing(false);
    }
  }, [dirHandle, visibleFiles, newNameMap, conflictSet, loadFiles]);

  // ── Number preview helper ────────────────────────────────────────────────────

  const numPreview = String(rules.numberAdd.startNum).padStart(rules.numberAdd.digits, '0');
  const numSep = rules.numberAdd.separator === 'none' ? '' : rules.numberAdd.separator;

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Guide */}
      <ToolGuide title="파일명 일괄 변환 사용 가이드">
        <div className="pt-3">
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li>폴더 선택 후 파일 목록이 자동으로 표시됩니다</li>
            <li>변환 규칙을 설정하면 <span className="text-blue-600 font-medium">새 이름</span> 열에서 결과를 미리 확인할 수 있습니다</li>
            <li>적용 순서: 찾아바꾸기 → 대소문자 → 텍스트추가 → 번호추가 → 확장자 변경</li>
            <li>Chrome / Edge 브라우저에서만 실제 파일 변경이 지원됩니다</li>
          </ul>
        </div>
      </ToolGuide>

      {/* Folder Picker / Drop Zone */}
      <Card>
        <CardContent className="p-4">
          {/* 폴더 로드 후: 컴팩트 상태바 */}
          {dirHandle ? (
            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="outline" size="sm" onClick={handlePickFolder} disabled={processing}>
                <FolderOpen className="h-4 w-4 mr-2" />
                폴더 변경
              </Button>
              <span className="text-[14px] text-black font-normal">{dirHandle.name}</span>
              <Badge variant="secondary">{files.length}개 파일</Badge>
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={processing}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                새로고침
              </Button>
            </div>
          ) : (
            /* 폴더 미선택: 드롭존 */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handlePickFolder}
              className={`
                border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer
                ${isDragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50'}
              `}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${isDragOver ? 'bg-blue-200' : 'bg-blue-100'}`}>
                  {isDragOver
                    ? <Upload className="h-7 w-7 text-blue-600" />
                    : <FolderOpen className="h-7 w-7 text-blue-600" />}
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-700">
                    {isDragOver ? '여기에 놓으세요' : '폴더를 드래그하거나 클릭하여 선택하세요'}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    탐색기에서 폴더를 이 영역으로 끌어다 놓으면 자동으로 로드됩니다
                  </p>
                  {!isSupported && (
                    <p className="text-xs text-red-500 mt-2 flex items-center justify-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Chrome / Edge 브라우저에서만 지원됩니다
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extension Filter (only if multiple extensions) */}
      {availableExts.length > 1 && (
        <div className="flex items-center gap-3 px-1">
          <span className="text-sm text-slate-500 shrink-0">확장자 필터:</span>
          {availableExts.map(ext => (
            <label key={ext} className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                checked={!extFilter.size || extFilter.has(ext)}
                onCheckedChange={() => toggleExt(ext)}
              />
              <span className="text-sm font-mono uppercase">{ext}</span>
            </label>
          ))}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <FileText className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium">파일 목록</span>
                <Badge variant="outline" className="text-xs">
                  {selectedCount}/{visibleFiles.length}개 선택
                </Badge>
                {changedCount > 0 && (
                  <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">
                    {changedCount}개 변경 예정
                  </Badge>
                )}
                {conflictSet.size > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    중복 {conflictSet.size}개
                  </Badge>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => toggleAll(true)}>전체선택</Button>
                <Button variant="ghost" size="sm" onClick={() => toggleAll(false)}>선택해제</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b bg-slate-50">
                    <th className="w-10 p-2 text-center">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(c) => toggleAll(c === true)}
                      />
                    </th>
                    <th className="w-10 p-2 text-center text-slate-400 font-normal text-xs">#</th>
                    <th className="p-2 text-left text-slate-600 font-medium text-xs">현재 이름</th>
                    <th className="w-8 p-2 text-center text-slate-300 text-xs">→</th>
                    <th className="p-2 text-left text-slate-600 font-medium text-xs">새 이름</th>
                    <th className="w-10 p-2" />
                  </tr>
                </thead>
                <tbody>
                  {visibleFiles.map((file, i) => {
                    const newName = file.selected ? (newNameMap.get(file.name) ?? file.name) : file.name;
                    const changed = file.selected && newName !== file.name;
                    const conflict = changed && conflictSet.has(newName);
                    return (
                      <tr
                        key={file.name}
                        className={`border-b last:border-0 hover:bg-slate-50/50 ${!file.selected ? 'opacity-40' : ''}`}
                      >
                        <td className="p-2 text-center">
                          <Checkbox
                            checked={file.selected}
                            onCheckedChange={(c) => toggleOne(file.name, c === true)}
                          />
                        </td>
                        <td className="p-2 text-center text-slate-400 tabular-nums text-xs">{i + 1}</td>
                        <td className="p-2 font-mono text-xs text-slate-700 max-w-[180px] truncate" title={file.name}>
                          {file.name}
                        </td>
                        <td className="p-2 text-center text-slate-300 text-xs">→</td>
                        <td
                          className={`p-2 font-mono text-xs max-w-[180px] truncate font-semibold ${
                            conflict ? 'text-red-600' : changed ? 'text-blue-600' : 'text-slate-400 font-normal'
                          }`}
                          title={newName}
                        >
                          {newName}
                        </td>
                        <td className="p-2 text-center">
                          {conflict && <AlertTriangle className="h-3.5 w-3.5 text-red-500 mx-auto" />}
                          {!conflict && changed && (
                            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules Card */}
      <Card>
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-black font-bold">변환 규칙</span>
            <Button variant="ghost" size="sm" onClick={() => setRules(DEFAULT_RULES)}>
              <X className="h-3.5 w-3.5 mr-1" />
              초기화
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-5">

          {/* ① 찾아 바꾸기 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch
                id="sw-find"
                checked={rules.findReplace.enabled}
                onCheckedChange={(v) => updateRule('findReplace', { enabled: v })}
              />
              <Label htmlFor="sw-find" className="cursor-pointer font-medium">① 찾아 바꾸기</Label>
            </div>
            {rules.findReplace.enabled && (
              <div className="pl-8 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">찾을 내용</Label>
                    <Input
                      placeholder="찾을 텍스트"
                      value={rules.findReplace.find}
                      onChange={(e) => updateRule('findReplace', { find: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">바꿀 내용 (비우면 삭제)</Label>
                    <Input
                      placeholder="바꿀 텍스트"
                      value={rules.findReplace.replace}
                      onChange={(e) => updateRule('findReplace', { replace: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <Checkbox
                      checked={rules.findReplace.caseSensitive}
                      onCheckedChange={(c) => updateRule('findReplace', { caseSensitive: c === true })}
                    />
                    대소문자 구분
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <Checkbox
                      checked={rules.findReplace.useRegex}
                      onCheckedChange={(c) => updateRule('findReplace', { useRegex: c === true })}
                    />
                    정규식 사용
                  </label>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* ② 대소문자 변환 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch
                id="sw-case"
                checked={rules.caseConvert.enabled}
                onCheckedChange={(v) => updateRule('caseConvert', { enabled: v })}
              />
              <Label htmlFor="sw-case" className="cursor-pointer font-medium">② 대/소문자 변환</Label>
            </div>
            {rules.caseConvert.enabled && (
              <div className="pl-8">
                <RadioGroup
                  value={rules.caseConvert.type}
                  onValueChange={(v) => updateRule('caseConvert', { type: v as 'upper' | 'lower' })}
                  className="flex gap-5"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="upper" id="case-upper" />
                    <Label htmlFor="case-upper">모두 대문자 (ABC.JPG)</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="lower" id="case-lower" />
                    <Label htmlFor="case-lower">모두 소문자 (abc.jpg)</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>

          <Separator />

          {/* ③ 텍스트 추가 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch
                id="sw-text"
                checked={rules.textAdd.enabled}
                onCheckedChange={(v) => updateRule('textAdd', { enabled: v })}
              />
              <Label htmlFor="sw-text" className="cursor-pointer font-medium">③ 텍스트 추가</Label>
            </div>
            {rules.textAdd.enabled && (
              <div className="pl-8 space-y-3">
                <RadioGroup
                  value={rules.textAdd.position}
                  onValueChange={(v) => updateRule('textAdd', { position: v as 'prefix' | 'suffix' })}
                  className="flex gap-5"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="prefix" id="text-prefix" />
                    <Label htmlFor="text-prefix">접두사 (파일명 앞)</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="suffix" id="text-suffix" />
                    <Label htmlFor="text-suffix">접미사 (파일명 뒤)</Label>
                  </div>
                </RadioGroup>
                <div className="flex items-center gap-3">
                  <Input
                    className="max-w-xs"
                    placeholder="추가할 텍스트"
                    value={rules.textAdd.text}
                    onChange={(e) => updateRule('textAdd', { text: e.target.value })}
                  />
                  {rules.textAdd.text && (
                    <span className="text-xs text-slate-500 font-mono">
                      예: {rules.textAdd.position === 'prefix'
                        ? `${rules.textAdd.text}파일명.jpg`
                        : `파일명${rules.textAdd.text}.jpg`}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* ④ 번호 추가 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch
                id="sw-num"
                checked={rules.numberAdd.enabled}
                onCheckedChange={(v) => updateRule('numberAdd', { enabled: v })}
              />
              <Label htmlFor="sw-num" className="cursor-pointer font-medium">④ 번호 추가</Label>
            </div>
            {rules.numberAdd.enabled && (
              <div className="pl-8 space-y-3">
                <RadioGroup
                  value={rules.numberAdd.position}
                  onValueChange={(v) => updateRule('numberAdd', { position: v as 'prefix' | 'suffix' })}
                  className="flex gap-5"
                >
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="prefix" id="num-prefix" />
                    <Label htmlFor="num-prefix">파일명 앞</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="suffix" id="num-suffix" />
                    <Label htmlFor="num-suffix">파일명 뒤</Label>
                  </div>
                </RadioGroup>
                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">시작 번호</Label>
                    <Input
                      type="number"
                      min={0}
                      className="w-24"
                      value={rules.numberAdd.startNum}
                      onChange={(e) => updateRule('numberAdd', { startNum: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">자릿수</Label>
                    <Select
                      value={String(rules.numberAdd.digits)}
                      onValueChange={(v) => updateRule('numberAdd', { digits: Number(v) })}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map(d => (
                          <SelectItem key={d} value={String(d)}>
                            {d}자리 ({String(rules.numberAdd.startNum).padStart(d, '0')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">구분자</Label>
                    <Select
                      value={rules.numberAdd.separator}
                      onValueChange={(v) => updateRule('numberAdd', { separator: v as 'none' | '_' | '-' | '.' })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">없음</SelectItem>
                        <SelectItem value="_">언더바 ( _ )</SelectItem>
                        <SelectItem value="-">하이픈 ( - )</SelectItem>
                        <SelectItem value=".">점 ( . )</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="self-end pb-0.5">
                    <span className="text-xs text-slate-500 font-mono">
                      예: {rules.numberAdd.position === 'prefix'
                        ? `${numPreview}${numSep}파일명.jpg`
                        : `파일명${numSep}${numPreview}.jpg`}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* ⑤ 확장자 변경 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch
                id="sw-ext"
                checked={rules.extChange.enabled}
                onCheckedChange={(v) => updateRule('extChange', { enabled: v })}
              />
              <Label htmlFor="sw-ext" className="cursor-pointer font-medium">⑤ 확장자 변경</Label>
            </div>
            {rules.extChange.enabled && (
              <div className="pl-8 space-y-2">
                <Select
                  value={rules.extChange.newExt}
                  onValueChange={(v) => updateRule('extChange', { newExt: v })}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jpg">JPG</SelectItem>
                    <SelectItem value="jpeg">JPEG</SelectItem>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="webp">WEBP</SelectItem>
                    <SelectItem value="gif">GIF</SelectItem>
                    <SelectItem value="tif">TIF</SelectItem>
                    <SelectItem value="tiff">TIFF</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-amber-600">
                  ⚠ 확장자만 변경되며 실제 이미지 포맷 변환은 수행되지 않습니다
                </p>
              </div>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Action Bar */}
      {files.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <span className="text-sm text-slate-500">
            {changedCount > 0
              ? `${selectedCount}개 선택 · ${changedCount}개 변경 예정`
              : `${selectedCount}개 선택 · 변경 없음`}
            {conflictSet.size > 0 && (
              <span className="text-red-500 ml-2">· 중복 {conflictSet.size}개 해결 필요</span>
            )}
          </span>
          <Button
            onClick={handleRename}
            disabled={processing || changedCount === 0 || conflictSet.size > 0}
            size="lg"
          >
            <Play className="h-4 w-4 mr-2" />
            {processing ? '변경 중...' : `파일명 바꾸기 (${changedCount}개)`}
          </Button>
        </div>
      )}

      <ToolUsageCounter toolId="file-rename" onTrackUse={(fn) => { trackUseRef.current = fn; }} />
    </div>
  );
}
