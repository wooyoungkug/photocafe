const fs = require('fs');
const filePath = 'apps/web/app/(dashboard)/pricing/production/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 새로운 UI 코드 (구간별 가격 설정)
const newUI = `                  <>
                    {/* [2.제본전용] 구간별 Nup+면당가격 */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">구간별 Nup+면당가격</Label>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const nupSpecs = specifications?.filter(s => s.nup) || [];
                              const defaultRangePrices: Record<number, number> = {};
                              settingForm.pageRanges.forEach(p => { defaultRangePrices[p] = 0; });
                              setSettingForm(prev => ({
                                ...prev,
                                specificationIds: nupSpecs.map(s => s.id),
                                nupPageRanges: nupSpecs.map(s => {
                                  const existing = prev.nupPageRanges.find(p => p.specificationId === s.id);
                                  return existing || { specificationId: s.id, pricePerPage: 0, rangePrices: { ...defaultRangePrices } };
                                }),
                              }));
                            }}
                          >
                            전체선택
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSettingForm(prev => ({
                                ...prev,
                                specificationIds: [],
                                nupPageRanges: [],
                              }));
                            }}
                          >
                            전체해제
                          </Button>
                        </div>
                      </div>

                      {/* 페이지 구간 설정 */}
                      <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium text-blue-700">페이지 구간 설정</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-blue-600"
                            onClick={() => {
                              const newRange = Math.max(...settingForm.pageRanges) + 10;
                              setSettingForm(prev => ({
                                ...prev,
                                pageRanges: [...prev.pageRanges, newRange].sort((a, b) => a - b),
                              }));
                            }}
                          >
                            + 구간 추가
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {settingForm.pageRanges.map((range, idx) => (
                            <div key={idx} className="flex items-center gap-1 bg-white rounded px-2 py-1 border border-blue-200">
                              <Input
                                type="number"
                                value={range}
                                onChange={(e) => {
                                  const newValue = Number(e.target.value);
                                  setSettingForm(prev => ({
                                    ...prev,
                                    pageRanges: prev.pageRanges.map((r, i) => i === idx ? newValue : r).sort((a, b) => a - b),
                                  }));
                                }}
                                className="h-6 w-14 text-center text-sm font-mono border-0 p-0"
                              />
                              <span className="text-xs text-blue-600">p</span>
                              {settingForm.pageRanges.length > 2 && (
                                <button
                                  type="button"
                                  className="text-red-400 hover:text-red-600 ml-1"
                                  onClick={() => {
                                    setSettingForm(prev => ({
                                      ...prev,
                                      pageRanges: prev.pageRanges.filter((_, i) => i !== idx),
                                    }));
                                  }}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground bg-amber-50 rounded p-2 mb-2">
                        <p className="font-medium mb-1">계산 공식:</p>
                        <p>• 구간 가격: 첫 구간 가격 + ((구간 - 첫구간) × 1p당 가격)</p>
                        <p className="text-amber-700 mt-1">예) 20p 35,000원, 1p당 500원 → 30p = 35,000 + (10 × 500) = 40,000원</p>
                        <p className="text-amber-700">예) 23p? → 20p 구간 기준: 35,000 + (3 × 500) = 36,500원</p>
                      </div>

                      <div className="border rounded-lg p-4 max-h-[500px] overflow-y-auto">
                        {/* 테이블 헤더 - 동적 컬럼 */}
                        <div
                          className="grid gap-2 pb-2 border-b mb-2 text-xs font-medium text-gray-600"
                          style={{ gridTemplateColumns: \`1fr 80px 80px \${settingForm.pageRanges.map(() => '90px').join(' ')}\` }}
                        >
                          <span>규격</span>
                          <span className="text-center">Nup</span>
                          <span className="text-right">1p당</span>
                          {settingForm.pageRanges.map(range => (
                            <span key={range} className="text-right text-blue-600">{range}p</span>
                          ))}
                        </div>

                        <div className="space-y-1">
                          {specifications?.filter(s => s.nup).map((spec) => {
                            const isSelected = settingForm.specificationIds.includes(spec.id);
                            const rangeData = settingForm.nupPageRanges.find(p => p.specificationId === spec.id);
                            const pricePerPage = rangeData?.pricePerPage || 0;
                            const rangePrices = rangeData?.rangePrices || {};

                            // 첫 구간 기준으로 자동 계산
                            const firstRange = settingForm.pageRanges[0] || 20;
                            const firstPrice = rangePrices[firstRange] || 0;
                            const calcRangePrice = (range: number) => {
                              if (range === firstRange) return firstPrice;
                              return firstPrice + ((range - firstRange) * pricePerPage);
                            };

                            return (
                              <div
                                key={spec.id}
                                className={cn(
                                  "grid gap-2 py-2 items-center border-b last:border-b-0",
                                  isSelected && "bg-amber-50/50"
                                )}
                                style={{ gridTemplateColumns: \`1fr 80px 80px \${settingForm.pageRanges.map(() => '90px').join(' ')}\` }}
                              >
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      setSettingForm(prev => {
                                        const defaultRangePrices: Record<number, number> = {};
                                        prev.pageRanges.forEach(p => { defaultRangePrices[p] = 0; });
                                        if (checked) {
                                          return {
                                            ...prev,
                                            specificationIds: [...prev.specificationIds, spec.id],
                                            nupPageRanges: [...prev.nupPageRanges, {
                                              specificationId: spec.id,
                                              pricePerPage: 0,
                                              rangePrices: defaultRangePrices
                                            }],
                                          };
                                        } else {
                                          return {
                                            ...prev,
                                            specificationIds: prev.specificationIds.filter(id => id !== spec.id),
                                            nupPageRanges: prev.nupPageRanges.filter(p => p.specificationId !== spec.id),
                                          };
                                        }
                                      });
                                    }}
                                  />
                                  <span className="text-sm font-mono">{spec.name}</span>
                                </label>
                                <span className="text-center text-sm font-medium text-violet-600">{spec.nup}</span>

                                {isSelected ? (
                                  <>
                                    {/* 1p당 가격 입력 */}
                                    <Input
                                      type="number"
                                      value={pricePerPage || ''}
                                      onChange={(e) => {
                                        const value = Number(e.target.value);
                                        setSettingForm(prev => {
                                          const currentData = prev.nupPageRanges.find(p => p.specificationId === spec.id);
                                          const currentFirstPrice = currentData?.rangePrices?.[firstRange] || 0;
                                          // 1p당 가격 변경 시 나머지 구간 자동 계산
                                          const newRangePrices: Record<number, number> = {};
                                          prev.pageRanges.forEach(range => {
                                            if (range === firstRange) {
                                              newRangePrices[range] = currentFirstPrice;
                                            } else {
                                              newRangePrices[range] = currentFirstPrice + ((range - firstRange) * value);
                                            }
                                          });
                                          return {
                                            ...prev,
                                            nupPageRanges: prev.nupPageRanges.map(p =>
                                              p.specificationId === spec.id
                                                ? { ...p, pricePerPage: value, rangePrices: newRangePrices }
                                                : p
                                            ),
                                          };
                                        });
                                      }}
                                      className="h-8 text-right font-mono text-sm"
                                      placeholder="500"
                                    />
                                    {/* 구간별 가격 - 첫번째만 입력 가능, 나머지는 자동 계산 */}
                                    {settingForm.pageRanges.map((range, idx) => (
                                      <Input
                                        key={range}
                                        type="number"
                                        value={idx === 0 ? (rangePrices[range] || '') : calcRangePrice(range)}
                                        onChange={(e) => {
                                          if (idx !== 0) return;
                                          const value = Number(e.target.value);
                                          setSettingForm(prev => {
                                            const currentData = prev.nupPageRanges.find(p => p.specificationId === spec.id);
                                            const currentPricePerPage = currentData?.pricePerPage || 0;
                                            const newRangePrices: Record<number, number> = {};
                                            prev.pageRanges.forEach(r => {
                                              if (r === firstRange) {
                                                newRangePrices[r] = value;
                                              } else {
                                                newRangePrices[r] = value + ((r - firstRange) * currentPricePerPage);
                                              }
                                            });
                                            return {
                                              ...prev,
                                              nupPageRanges: prev.nupPageRanges.map(p =>
                                                p.specificationId === spec.id
                                                  ? { ...p, rangePrices: newRangePrices }
                                                  : p
                                              ),
                                            };
                                          });
                                        }}
                                        className={cn(
                                          "h-8 text-right font-mono text-sm",
                                          idx === 0 ? "bg-white" : "bg-blue-50 text-blue-700"
                                        )}
                                        placeholder="0"
                                        readOnly={idx !== 0}
                                      />
                                    ))}
                                  </>
                                ) : (
                                  <>
                                    <span className="text-right text-gray-400 text-sm">-</span>
                                    {settingForm.pageRanges.map(range => (
                                      <span key={range} className="text-right text-gray-400 text-sm">-</span>
                                    ))}
                                  </>
                                )}
                              </div>
                            );
                          })}
                          {(!specifications || specifications.filter(s => s.nup).length === 0) && (
                            <p className="text-center text-muted-foreground py-4">
                              Nup이 설정된 규격이 없습니다. 규격 관리에서 Nup 값을 설정해주세요.
                            </p>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        선택된 규격: {settingForm.specificationIds.length}개
                      </p>
                    </div>
                  <>`;

// 기존 nup_page_range UI를 찾아서 교체
// settingForm.pricingType === "nup_page_range" ? ( 이후의 <> ... </> 블록을 교체

const startPattern = ') : settingForm.pricingType === "nup_page_range" ? (';
const startIdx = content.indexOf(startPattern);

if (startIdx === -1) {
  console.log('Start pattern not found');
  process.exit(1);
}

// 블록 시작점
const blockStart = startIdx + startPattern.length;

// React Fragment(<> ... </>) 블록의 끝 찾기
let depth = 0;
let blockEnd = -1;
let foundFirstFragment = false;

for (let i = blockStart; i < content.length; i++) {
  const twoChars = content.substring(i, i + 2);
  const threeChars = content.substring(i, i + 3);

  if (twoChars === '<>' && !foundFirstFragment) {
    depth = 1;
    foundFirstFragment = true;
    continue;
  }

  if (foundFirstFragment) {
    if (twoChars === '<>') depth++;
    if (threeChars === '</>') {
      depth--;
      if (depth === 0) {
        blockEnd = i + 3; // </> 뒤
        break;
      }
    }
  }
}

if (blockEnd === -1) {
  console.log('Block end not found');
  process.exit(1);
}

// 교체
const before = content.substring(0, blockStart);
const after = content.substring(blockEnd);

// 마지막 <>를 </>로 수정 (닫는 태그)
const fixedNewUI = newUI.replace(/\<\>$/, '</>');

content = before + '\n' + fixedNewUI + after;

fs.writeFileSync(filePath, content, 'utf8');
console.log('Step 4: UI updated successfully');
