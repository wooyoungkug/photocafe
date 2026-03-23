import * as React from "react";
import { cn } from "@/lib/utils";

export interface DebouncedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  /** 외부 value (controlled) */
  value: string | number;
  /** blur 또는 Enter 시 확정된 값 전달 */
  onChange: (value: string) => void;
}

/**
 * 로컬 상태를 유지하며, blur/Enter 시에만 부모에 값을 전달하는 Input.
 * - 한글 IME 조합 중 리렌더로 커서가 사라지는 문제 방지
 * - 연타 입력이 끊기지 않음
 */
const DebouncedInput = React.forwardRef<HTMLInputElement, DebouncedInputProps>(
  ({ className, value, onChange, onKeyDown, onBlur, ...props }, ref) => {
    const [localValue, setLocalValue] = React.useState(String(value ?? ""));
    const composingRef = React.useRef(false);

    // 외부 value가 변경되면 로컬 동기화 (포커스 없을 때만)
    React.useEffect(() => {
      if (!composingRef.current) {
        setLocalValue(String(value ?? ""));
      }
    }, [value]);

    const commit = React.useCallback(() => {
      onChange(localValue);
    }, [localValue, onChange]);

    return (
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
        }}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={() => {
          composingRef.current = false;
        }}
        onBlur={(e) => {
          commit();
          onBlur?.(e);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !composingRef.current) {
            commit();
          }
          onKeyDown?.(e);
        }}
        {...props}
      />
    );
  }
);
DebouncedInput.displayName = "DebouncedInput";

export { DebouncedInput };
