'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { RichTextEditor } from './rich-text-editor';
import { QuillEditor } from './quill-editor';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { Palette, Type, ImagePlus, Loader2 } from 'lucide-react';

const EDITOR_STORAGE_KEY = 'preferred-product-editor';

// TinyMCE는 동적 로드 (무거움)
const TinyMCEEditor = dynamic(
  () => import('./tinymce-editor').then((mod) => mod.TinyMCEEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] bg-muted animate-pulse rounded-lg flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

type EditorType = 'quill' | 'tiptap' | 'tinymce';

interface ProductEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onImageUpload?: (file: File) => Promise<string>;
  defaultEditor?: EditorType;
}

export function ProductEditor({
  value,
  onChange,
  placeholder = '상품 상세 설명을 입력하세요...',
  className,
  onImageUpload,
  defaultEditor = 'quill',
}: ProductEditorProps) {
  const [editorType, setEditorType] = useState<EditorType>(defaultEditor);


  // 저장된 에디터 타입 불러오기
  useEffect(() => {
    const saved = localStorage.getItem(EDITOR_STORAGE_KEY) as EditorType | null;
    if (saved && ['quill', 'tiptap', 'tinymce'].includes(saved)) {
      setEditorType(saved);
    }
  }, []);

  // 에디터 타입 변경 시 저장
  const handleEditorChange = (type: EditorType) => {
    setEditorType(type);
    localStorage.setItem(EDITOR_STORAGE_KEY, type);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* 에디터 선택 탭 */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        <Button
          type="button"
          variant={editorType === 'quill' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleEditorChange('quill')}
          className="h-8 gap-1.5 text-xs"
        >
          <Palette className="h-3.5 w-3.5" />
          Quill
        </Button>
        <Button
          type="button"
          variant={editorType === 'tiptap' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleEditorChange('tiptap')}
          className="h-8 gap-1.5 text-xs"
        >
          <Type className="h-3.5 w-3.5" />
          Tiptap
        </Button>
        <Button
          type="button"
          variant={editorType === 'tinymce' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleEditorChange('tinymce')}
          className="h-8 gap-1.5 text-xs"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          TinyMCE (이미지편집)
        </Button>
      </div>

      {/* 선택된 에디터 */}
      {editorType === 'quill' && (
        <QuillEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onImageUpload={onImageUpload}
        />
      )}
      {editorType === 'tiptap' && (
        <RichTextEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onImageUpload={onImageUpload}
        />
      )}
      {editorType === 'tinymce' && (
        <TinyMCEEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onImageUpload={onImageUpload}
        />
      )}
    </div>
  );
}
