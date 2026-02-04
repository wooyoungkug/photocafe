'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { OutputDataUploader } from '@/components/upload/output-data-uploader';

export default function TestUploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="출력데이터 업로드 테스트"
        description="출력용 이미지 파일을 업로드하고 분석합니다."
      />

      <div className="max-w-4xl">
        <OutputDataUploader
          onFilesChange={setUploadedFiles}
          maxFiles={50}
        />
      </div>

      {uploadedFiles.length > 0 && (
        <div className="max-w-4xl">
          <h3 className="text-lg font-medium mb-4">업로드된 파일 데이터 (디버그)</h3>
          <pre className="p-4 bg-gray-100 rounded-lg text-xs overflow-auto max-h-[400px]">
            {JSON.stringify(
              uploadedFiles.map(f => ({
                filename: f.filename,
                widthInch: f.widthInch,
                heightInch: f.heightInch,
                dpi: f.dpi,
                pageType: f.pageType,
                isFirst: f.isFirst,
                isLast: f.isLast,
                hasWarning: f.hasWarning,
                warningMessage: f.warningMessage,
                relativePath: f.relativePath,
              })),
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
