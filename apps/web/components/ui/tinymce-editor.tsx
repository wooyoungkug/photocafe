'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

// TinyMCE를 동적으로 로드하여 초기 번들 크기 감소
const Editor = dynamic(
  () => import('@tinymce/tinymce-react').then((mod) => ({ default: mod.Editor })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[400px] border rounded-lg bg-muted/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">에디터 로딩 중...</p>
        </div>
      </div>
    ),
  }
);

interface TinyMCEEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onImageUpload?: (file: File) => Promise<string>;
}

export function TinyMCEEditor({
  value,
  onChange,
  placeholder = '내용을 입력하세요...',
  className,
  onImageUpload,
}: TinyMCEEditorProps) {
  const editorRef = useRef<any>(null);

  const handleImageUpload = async (blobInfo: any): Promise<string> => {
    const file = blobInfo.blob();

    if (onImageUpload) {
      try {
        const url = await onImageUpload(file);
        return url;
      } catch (error) {
        throw error;
      }
    } else {
      // Base64로 변환
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  return (
    <div className={cn('tinymce-wrapper', className)}>
      <Editor
        apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
        onInit={(evt, editor) => (editorRef.current = editor)}
        value={value}
        onEditorChange={(newValue) => onChange(newValue)}
        init={{
          height: 400,
          menubar: true,
          plugins: [
            'advlist',
            'autolink',
            'lists',
            'link',
            'image',
            'charmap',
            'preview',
            'anchor',
            'searchreplace',
            'visualblocks',
            'code',
            'fullscreen',
            'insertdatetime',
            'media',
            'table',
            'help',
            'wordcount',
            'emoticons',
          ],
          toolbar:
            'undo redo | blocks | ' +
            'bold italic forecolor backcolor | alignleft aligncenter ' +
            'alignright alignjustify | bullist numlist outdent indent | ' +
            'image media table | emoticons charmap | ' +
            'removeformat | fullscreen preview | help',
          content_style: `
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 14px;
              line-height: 1.6;
            }
            img {
              max-width: 100%;
              height: auto;
            }
          `,
          placeholder,
          // 이미지 설정
          image_caption: true,
          image_advtab: true,
          image_title: true,
          automatic_uploads: true,
          file_picker_types: 'image',
          images_upload_handler: handleImageUpload,
          // 이미지 툴바
          image_toolbar: 'alignleft aligncenter alignright | rotateleft rotateright | imageoptions',
          // 이미지 클래스
          image_class_list: [
            { title: '기본', value: '' },
            { title: '둥근 모서리', value: 'rounded-lg' },
            { title: '그림자', value: 'shadow-lg' },
            { title: '테두리', value: 'border border-gray-200' },
          ],
          // 브라우저 스펠체크 비활성화
          browser_spellcheck: false,
          // 붙여넣기 시 스타일 유지
          paste_data_images: true,
          // 테이블 설정
          table_toolbar: 'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol',
          // 미디어 설정
          media_live_embeds: true,
          // 기타 설정
          branding: false,
          promotion: false,
          resize: true,
          statusbar: true,
        }}
      />
      <style jsx global>{`
        .tinymce-wrapper .tox-tinymce {
          border-radius: 0.5rem;
          border: 1px solid hsl(var(--border));
        }
        .tinymce-wrapper .tox-toolbar__primary {
          background: hsl(var(--muted) / 0.3) !important;
        }
        .tinymce-wrapper .tox-edit-area__iframe {
          background: hsl(var(--background)) !important;
        }
      `}</style>
    </div>
  );
}
