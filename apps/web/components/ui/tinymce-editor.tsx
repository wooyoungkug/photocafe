'use client';

import { useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { cn } from '@/lib/utils';

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
        console.error('이미지 업로드 실패:', error);
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
