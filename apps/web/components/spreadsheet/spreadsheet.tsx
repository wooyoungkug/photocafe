"use client";

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { cn } from "@/lib/utils";

export interface CellData {
  value?: string;
  formula?: string;
}

export interface SpreadsheetData {
  [key: string]: CellData;
}

export interface SpreadsheetProps {
  initialRows?: number;
  initialCols?: number;
  data?: SpreadsheetData;
  onChange?: (data: SpreadsheetData) => void;
  className?: string;
}

const getColumnLabel = (index: number): string => {
  let label = "";
  let num = index;
  while (num >= 0) {
    label = String.fromCharCode((num % 26) + 65) + label;
    num = Math.floor(num / 26) - 1;
  }
  return label;
};

const getCellKey = (row: number, col: number): string => {
  return `${getColumnLabel(col)}${row + 1}`;
};

const parseCellReference = (ref: string): { row: number; col: number } | null => {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;

  let col = 0;
  for (let i = 0; i < match[1].length; i++) {
    col = col * 26 + (match[1].charCodeAt(i) - 64);
  }
  return { row: parseInt(match[2]) - 1, col: col - 1 };
};

const evaluateFormula = (
  formula: string,
  data: SpreadsheetData,
  visited: Set<string> = new Set()
): string => {
  if (!formula.startsWith("=")) return formula;

  const expr = formula.slice(1).toUpperCase();

  // SUM function
  const sumMatch = expr.match(/^SUM\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
  if (sumMatch) {
    const start = parseCellReference(sumMatch[1]);
    const end = parseCellReference(sumMatch[2]);
    if (!start || !end) return "#ERROR!";

    let sum = 0;
    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        const key = getCellKey(r, c);
        const cellValue = getCellValue(key, data, visited);
        const num = parseFloat(cellValue);
        if (!isNaN(num)) sum += num;
      }
    }
    return sum.toString();
  }

  // AVG function
  const avgMatch = expr.match(/^AVG\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
  if (avgMatch) {
    const start = parseCellReference(avgMatch[1]);
    const end = parseCellReference(avgMatch[2]);
    if (!start || !end) return "#ERROR!";

    let sum = 0;
    let count = 0;
    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        const key = getCellKey(r, c);
        const cellValue = getCellValue(key, data, visited);
        const num = parseFloat(cellValue);
        if (!isNaN(num)) {
          sum += num;
          count++;
        }
      }
    }
    return count > 0 ? (sum / count).toString() : "0";
  }

  // MIN function
  const minMatch = expr.match(/^MIN\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
  if (minMatch) {
    const start = parseCellReference(minMatch[1]);
    const end = parseCellReference(minMatch[2]);
    if (!start || !end) return "#ERROR!";

    let min = Infinity;
    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        const key = getCellKey(r, c);
        const cellValue = getCellValue(key, data, visited);
        const num = parseFloat(cellValue);
        if (!isNaN(num) && num < min) min = num;
      }
    }
    return min === Infinity ? "0" : min.toString();
  }

  // MAX function
  const maxMatch = expr.match(/^MAX\(([A-Z]+\d+):([A-Z]+\d+)\)$/);
  if (maxMatch) {
    const start = parseCellReference(maxMatch[1]);
    const end = parseCellReference(maxMatch[2]);
    if (!start || !end) return "#ERROR!";

    let max = -Infinity;
    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        const key = getCellKey(r, c);
        const cellValue = getCellValue(key, data, visited);
        const num = parseFloat(cellValue);
        if (!isNaN(num) && num > max) max = num;
      }
    }
    return max === -Infinity ? "0" : max.toString();
  }

  // Simple cell reference
  const cellRef = parseCellReference(expr);
  if (cellRef) {
    const key = getCellKey(cellRef.row, cellRef.col);
    return getCellValue(key, data, visited);
  }

  // Simple arithmetic
  try {
    const replaced = expr.replace(/([A-Z]+\d+)/g, (match) => {
      const ref = parseCellReference(match);
      if (!ref) return "0";
      const key = getCellKey(ref.row, ref.col);
      const val = getCellValue(key, data, visited);
      return isNaN(parseFloat(val)) ? "0" : val;
    });

    // Safe eval for simple arithmetic
    const result = Function(`"use strict"; return (${replaced})`)();
    return isNaN(result) ? "#ERROR!" : result.toString();
  } catch {
    return "#ERROR!";
  }
};

const getCellValue = (
  key: string,
  data: SpreadsheetData,
  visited: Set<string> = new Set()
): string => {
  if (visited.has(key)) return "#CIRCULAR!";

  const cell = data[key];
  if (!cell) return "";

  if (cell.formula) {
    visited.add(key);
    return evaluateFormula(cell.formula, data, visited);
  }

  return cell.value ?? "";
};

export function Spreadsheet({
  initialRows = 20,
  initialCols = 10,
  data: externalData,
  onChange,
  className,
}: SpreadsheetProps) {
  const [rows, setRows] = useState(initialRows);
  const [cols, setCols] = useState(initialCols);
  const [data, setData] = useState<SpreadsheetData>(externalData || {});
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ row: number; col: number } | null>(null);
  const [clipboard, setClipboard] = useState<SpreadsheetData>({});

  const inputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (externalData) {
      setData(externalData);
    }
  }, [externalData]);

  const updateData = useCallback((newData: SpreadsheetData) => {
    setData(newData);
    onChange?.(newData);
  }, [onChange]);

  const handleCellClick = useCallback((row: number, col: number, e: React.MouseEvent) => {
    const key = getCellKey(row, col);

    if (e.shiftKey && selectedCell) {
      const startRef = parseCellReference(selectedCell);
      if (startRef) {
        setSelectionStart(startRef);
        setSelectionEnd({ row, col });
      }
    } else {
      setSelectedCell(key);
      setSelectionStart({ row, col });
      setSelectionEnd({ row, col });
    }
  }, [selectedCell]);

  const handleCellDoubleClick = useCallback((row: number, col: number) => {
    const key = getCellKey(row, col);
    setEditingCell(key);
    const cell = data[key];
    setEditValue(cell?.formula || cell?.value || "");
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [data]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  }, []);

  const handleInputBlur = useCallback(() => {
    if (editingCell) {
      const newData = { ...data };
      if (editValue.startsWith("=")) {
        newData[editingCell] = { value: "", formula: editValue };
      } else {
        newData[editingCell] = { value: editValue };
      }
      updateData(newData);
      setEditingCell(null);
      setEditValue("");
    }
  }, [editingCell, editValue, data, updateData]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleInputBlur();
      if (selectedCell) {
        const ref = parseCellReference(selectedCell);
        if (ref && ref.row < rows - 1) {
          const newKey = getCellKey(ref.row + 1, ref.col);
          setSelectedCell(newKey);
          setSelectionStart({ row: ref.row + 1, col: ref.col });
          setSelectionEnd({ row: ref.row + 1, col: ref.col });
        }
      }
    } else if (e.key === "Escape") {
      setEditingCell(null);
      setEditValue("");
    } else if (e.key === "Tab") {
      e.preventDefault();
      handleInputBlur();
      if (selectedCell) {
        const ref = parseCellReference(selectedCell);
        if (ref && ref.col < cols - 1) {
          const newKey = getCellKey(ref.row, ref.col + 1);
          setSelectedCell(newKey);
          setSelectionStart({ row: ref.row, col: ref.col + 1 });
          setSelectionEnd({ row: ref.row, col: ref.col + 1 });
        }
      }
    }
  }, [handleInputBlur, selectedCell, rows, cols]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!selectedCell || editingCell) return;

    const ref = parseCellReference(selectedCell);
    if (!ref) return;

    let newRow = ref.row;
    let newCol = ref.col;

    switch (e.key) {
      case "ArrowUp":
        newRow = Math.max(0, ref.row - 1);
        break;
      case "ArrowDown":
        newRow = Math.min(rows - 1, ref.row + 1);
        break;
      case "ArrowLeft":
        newCol = Math.max(0, ref.col - 1);
        break;
      case "ArrowRight":
        newCol = Math.min(cols - 1, ref.col + 1);
        break;
      case "Enter":
        handleCellDoubleClick(ref.row, ref.col);
        return;
      case "Delete":
      case "Backspace":
        const newData = { ...data };
        delete newData[selectedCell];
        updateData(newData);
        return;
      case "c":
        if (e.ctrlKey || e.metaKey) {
          handleCopy();
          return;
        }
        break;
      case "v":
        if (e.ctrlKey || e.metaKey) {
          handlePaste();
          return;
        }
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          handleCellDoubleClick(ref.row, ref.col);
          setEditValue(e.key);
          return;
        }
        return;
    }

    const newKey = getCellKey(newRow, newCol);
    setSelectedCell(newKey);

    if (e.shiftKey) {
      setSelectionEnd({ row: newRow, col: newCol });
    } else {
      setSelectionStart({ row: newRow, col: newCol });
      setSelectionEnd({ row: newRow, col: newCol });
    }
  }, [selectedCell, editingCell, rows, cols, data, updateData]);

  const handleCopy = useCallback(() => {
    if (!selectionStart || !selectionEnd) return;

    const minRow = Math.min(selectionStart.row, selectionEnd.row);
    const maxRow = Math.max(selectionStart.row, selectionEnd.row);
    const minCol = Math.min(selectionStart.col, selectionEnd.col);
    const maxCol = Math.max(selectionStart.col, selectionEnd.col);

    const copied: SpreadsheetData = {};
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const key = getCellKey(r, c);
        const relKey = getCellKey(r - minRow, c - minCol);
        if (data[key]) {
          copied[relKey] = { ...data[key] };
        }
      }
    }
    setClipboard(copied);
  }, [selectionStart, selectionEnd, data]);

  const handlePaste = useCallback(() => {
    if (!selectedCell || Object.keys(clipboard).length === 0) return;

    const ref = parseCellReference(selectedCell);
    if (!ref) return;

    const newData = { ...data };
    Object.entries(clipboard).forEach(([relKey, cell]) => {
      const relRef = parseCellReference(relKey);
      if (relRef) {
        const targetKey = getCellKey(ref.row + relRef.row, ref.col + relRef.col);
        newData[targetKey] = { ...cell };
      }
    });
    updateData(newData);
  }, [selectedCell, clipboard, data, updateData]);

  const isInSelection = useCallback((row: number, col: number): boolean => {
    if (!selectionStart || !selectionEnd) return false;
    const minRow = Math.min(selectionStart.row, selectionEnd.row);
    const maxRow = Math.max(selectionStart.row, selectionEnd.row);
    const minCol = Math.min(selectionStart.col, selectionEnd.col);
    const maxCol = Math.max(selectionStart.col, selectionEnd.col);
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  }, [selectionStart, selectionEnd]);

  const addRow = useCallback(() => {
    setRows(r => r + 1);
  }, []);

  const addColumn = useCallback(() => {
    setCols(c => c + 1);
  }, []);

  const deleteRow = useCallback((rowIndex: number) => {
    if (rows <= 1) return;

    const newData: SpreadsheetData = {};
    Object.entries(data).forEach(([key, cell]) => {
      const ref = parseCellReference(key);
      if (!ref) return;

      if (ref.row < rowIndex) {
        newData[key] = cell;
      } else if (ref.row > rowIndex) {
        const newKey = getCellKey(ref.row - 1, ref.col);
        newData[newKey] = cell;
      }
    });

    updateData(newData);
    setRows(r => r - 1);
  }, [rows, data, updateData]);

  const deleteColumn = useCallback((colIndex: number) => {
    if (cols <= 1) return;

    const newData: SpreadsheetData = {};
    Object.entries(data).forEach(([key, cell]) => {
      const ref = parseCellReference(key);
      if (!ref) return;

      if (ref.col < colIndex) {
        newData[key] = cell;
      } else if (ref.col > colIndex) {
        const newKey = getCellKey(ref.row, ref.col - 1);
        newData[newKey] = cell;
      }
    });

    updateData(newData);
    setCols(c => c - 1);
  }, [cols, data, updateData]);

  const displayValue = useMemo(() => {
    if (selectedCell) {
      const cell = data[selectedCell];
      if (cell?.formula) {
        return evaluateFormula(cell.formula, data);
      }
      return cell?.value || "";
    }
    return "";
  }, [selectedCell, data]);

  const formulaBarValue = useMemo(() => {
    if (selectedCell) {
      const cell = data[selectedCell];
      return cell?.formula || cell?.value || "";
    }
    return "";
  }, [selectedCell, data]);

  return (
    <div className={cn("flex flex-col border rounded-lg overflow-hidden bg-background", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
        <button
          onClick={addRow}
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          + 행 추가
        </button>
        <button
          onClick={addColumn}
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          + 열 추가
        </button>
        <div className="h-6 w-px bg-border mx-2" />
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 text-sm border rounded hover:bg-accent"
        >
          복사
        </button>
        <button
          onClick={handlePaste}
          className="px-3 py-1.5 text-sm border rounded hover:bg-accent"
        >
          붙여넣기
        </button>
      </div>

      {/* Formula Bar */}
      <div className="flex items-center gap-2 p-2 border-b bg-muted/20">
        <span className="text-sm font-medium w-16 text-center">
          {selectedCell || "-"}
        </span>
        <div className="h-6 w-px bg-border" />
        <span className="text-sm font-mono flex-1 px-2">
          {formulaBarValue}
        </span>
        <span className="text-xs text-muted-foreground">
          = {displayValue}
        </span>
      </div>

      {/* Spreadsheet */}
      <div
        ref={tableRef}
        className="flex-1 overflow-auto"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <table className="border-collapse min-w-full">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="w-12 min-w-[48px] h-8 bg-muted border-b border-r text-xs font-medium text-muted-foreground sticky left-0 z-20">

              </th>
              {Array.from({ length: cols }).map((_, col) => (
                <th
                  key={col}
                  className="min-w-[100px] h-8 bg-muted border-b border-r text-xs font-medium text-muted-foreground group"
                >
                  <div className="flex items-center justify-center gap-1">
                    {getColumnLabel(col)}
                    <button
                      onClick={() => deleteColumn(col)}
                      className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 ml-1"
                      title="열 삭제"
                    >
                      ×
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, row) => (
              <tr key={row} className="group/row">
                <td className="w-12 min-w-[48px] h-8 bg-muted border-b border-r text-xs font-medium text-muted-foreground text-center sticky left-0 z-10">
                  <div className="flex items-center justify-center gap-1">
                    {row + 1}
                    <button
                      onClick={() => deleteRow(row)}
                      className="opacity-0 group-hover/row:opacity-100 text-destructive hover:text-destructive/80"
                      title="행 삭제"
                    >
                      ×
                    </button>
                  </div>
                </td>
                {Array.from({ length: cols }).map((_, col) => {
                  const key = getCellKey(row, col);
                  const isSelected = selectedCell === key;
                  const isEditing = editingCell === key;
                  const inSelection = isInSelection(row, col);
                  const cell = data[key];
                  const value = cell?.formula
                    ? evaluateFormula(cell.formula, data)
                    : cell?.value || "";

                  return (
                    <td
                      key={col}
                      className={cn(
                        "min-w-[100px] h-8 border-b border-r p-0 relative",
                        inSelection && "bg-primary/10",
                        isSelected && "ring-2 ring-primary ring-inset"
                      )}
                      onClick={(e) => handleCellClick(row, col, e)}
                      onDoubleClick={() => handleCellDoubleClick(row, col)}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editValue}
                          onChange={handleInputChange}
                          onBlur={handleInputBlur}
                          onKeyDown={handleInputKeyDown}
                          className="absolute inset-0 w-full h-full px-2 text-sm border-none outline-none bg-background"
                          autoFocus
                        />
                      ) : (
                        <div className="px-2 text-sm truncate h-full flex items-center">
                          {value}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t bg-muted/20 text-xs text-muted-foreground">
        <span>{rows} 행 × {cols} 열</span>
        <span>
          수식: =SUM(A1:B10), =AVG(A1:A10), =MIN/MAX, =A1+B1
        </span>
      </div>
    </div>
  );
}

export default Spreadsheet;
