'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StarRating } from './star-rating';
import { Loader2, Send } from 'lucide-react';

export interface ReviewFormData {
  reliabilityRating: number;
  kindnessRating: number;
  skillRating: number;
  comment: string;
  reviewerName: string;
  reviewerType: string;
}

interface ReviewFormProps {
  shootingTitle?: string;
  photographerName?: string;
  onSubmit: (data: ReviewFormData) => void;
  isLoading?: boolean;
}

const REVIEWER_TYPES = [
  { value: 'groom', label: '신랑' },
  { value: 'bride', label: '신부' },
  { value: 'parent', label: '부모님' },
  { value: 'other', label: '기타' },
];

export function ReviewForm({
  shootingTitle,
  photographerName,
  onSubmit,
  isLoading = false,
}: ReviewFormProps) {
  const [reliabilityRating, setReliabilityRating] = useState(0);
  const [kindnessRating, setKindnessRating] = useState(0);
  const [skillRating, setSkillRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerType, setReviewerType] = useState('');

  const isValid =
    reliabilityRating > 0 &&
    kindnessRating > 0 &&
    skillRating > 0 &&
    reviewerName.trim().length > 0 &&
    reviewerType.length > 0;

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({
      reliabilityRating,
      kindnessRating,
      skillRating,
      comment,
      reviewerName,
      reviewerType,
    });
  };

  return (
    <div className="space-y-6">
      {/* 촬영 정보 */}
      {(shootingTitle || photographerName) && (
        <Card>
          <CardContent className="py-4">
            {shootingTitle && (
              <p className="text-[14px] text-black font-normal">
                <span className="text-gray-500">촬영:</span> {shootingTitle}
              </p>
            )}
            {photographerName && (
              <p className="text-[14px] text-black font-normal mt-1">
                <span className="text-gray-500">작가:</span> {photographerName}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 별점 평가 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] text-black font-bold">촬영 평가</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 신뢰도 */}
          <div className="space-y-2">
            <Label className="text-[14px] text-black font-normal">
              신뢰도 <span className="text-red-500">*</span>
            </Label>
            <p className="text-[12px] text-gray-500">약속 시간 준수, 사전 소통 등</p>
            <StarRating
              value={reliabilityRating}
              onChange={setReliabilityRating}
              size="lg"
            />
          </div>

          {/* 친절도 */}
          <div className="space-y-2">
            <Label className="text-[14px] text-black font-normal">
              친절도 <span className="text-red-500">*</span>
            </Label>
            <p className="text-[12px] text-gray-500">응대 태도, 안내 등</p>
            <StarRating
              value={kindnessRating}
              onChange={setKindnessRating}
              size="lg"
            />
          </div>

          {/* 기술력 */}
          <div className="space-y-2">
            <Label className="text-[14px] text-black font-normal">
              기술력 <span className="text-red-500">*</span>
            </Label>
            <p className="text-[12px] text-gray-500">촬영 기술, 구도, 결과물 품질</p>
            <StarRating
              value={skillRating}
              onChange={setSkillRating}
              size="lg"
            />
          </div>

          {/* 코멘트 */}
          <div className="space-y-2">
            <Label className="text-[14px] text-black font-normal">한 줄 코멘트</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="촬영에 대한 소감을 남겨주세요 (선택)"
              rows={4}
              className="text-[14px] text-black"
            />
          </div>
        </CardContent>
      </Card>

      {/* 리뷰어 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] text-black font-bold">리뷰어 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[14px] text-black font-normal">
              이름 <span className="text-red-500">*</span>
            </Label>
            <Input
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="이름을 입력해주세요"
              className="text-[14px] text-black h-12"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[14px] text-black font-normal">
              관계 <span className="text-red-500">*</span>
            </Label>
            <Select value={reviewerType} onValueChange={setReviewerType}>
              <SelectTrigger className="text-[14px] h-12">
                <SelectValue placeholder="선택해주세요" />
              </SelectTrigger>
              <SelectContent>
                {REVIEWER_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 제출 버튼 */}
      <Button
        onClick={handleSubmit}
        disabled={!isValid || isLoading}
        className="w-full h-14 text-[16px] font-medium"
        size="lg"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <Send className="h-5 w-5 mr-2" />
        )}
        평가 제출
      </Button>
    </div>
  );
}
