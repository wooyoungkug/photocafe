'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAddSpecification, useUpdateSpecification, ProductSpecification } from '@/hooks/use-specifications';

const specificationSchema = z.object({
  name: z.string().min(1, '규격명은 필수입니다'),
  width: z.coerce.number().positive('가로는 양수여야 합니다'),
  height: z.coerce.number().positive('세로는 양수여야 합니다'),
  unit: z.enum(['mm', 'inch']),
});

type SpecificationFormValues = z.infer<typeof specificationSchema>;

interface SpecificationFormDialogProps {
  productId: string;
  specification?: ProductSpecification;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpecificationFormDialog({
  productId,
  specification,
  open,
  onOpenChange,
}: SpecificationFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addSpecification = useAddSpecification();
  const updateSpecification = useUpdateSpecification();

  const form = useForm<SpecificationFormValues>({
    resolver: zodResolver(specificationSchema),
    defaultValues: specification || {
      name: '',
      width: 210,
      height: 297,
      unit: 'mm',
    },
  });

  const onSubmit = async (data: SpecificationFormValues) => {
    setIsSubmitting(true);
    try {
      if (specification) {
        // 수정 모드
        await updateSpecification.mutateAsync({
          productId,
          specId: specification.id,
          data,
        });
      } else {
        // 추가 모드
        await addSpecification.mutateAsync({
          productId,
          data,
        });
      }
      form.reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{specification ? '규격 수정' : '규격 추가'}</DialogTitle>
          <DialogDescription>
            {specification ? '규격 정보를 수정합니다' : '새로운 규격을 추가합니다'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>규격명</FormLabel>
                  <FormControl>
                    <Input placeholder="예: A4, 4x6 inch, 210x297mm" {...field} />
                  </FormControl>
                  <FormDescription>규격을 식별할 수 있는 이름</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>가로</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="210" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>세로</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="297" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>단위</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="mm">mm (밀리미터)</SelectItem>
                      <SelectItem value="inch">inch (인치)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '저장 중...' : specification ? '수정' : '추가'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
