'use client';

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    Specification,
    CreateSpecificationRequest,
    UpdateSpecificationRequest,
    SpecificationQuery,
} from "@/lib/types/specification";

const BASIC_SPECIFICATIONS_KEY = "basic-specifications";

// ==================== 규격정보 조회 ====================

export function useBasicSpecifications(query?: SpecificationQuery) {
    return useQuery({
        queryKey: [BASIC_SPECIFICATIONS_KEY, query],
        queryFn: () =>
            api.get<Specification[]>(
                "/specifications",
                query as Record<string, string | number | boolean | undefined>
            ),
    });
}

export function useBasicSpecification(id: string) {
    return useQuery({
        queryKey: [BASIC_SPECIFICATIONS_KEY, id],
        queryFn: () => api.get<Specification>(`/specifications/${id}`),
        enabled: !!id,
    });
}

export function useSpecificationsByUsage(
    usage: "indigo" | "inkjet" | "album" | "frame" | "booklet"
) {
    return useQuery({
        queryKey: [BASIC_SPECIFICATIONS_KEY, "usage", usage],
        queryFn: () => api.get<Specification[]>(`/specifications/usage/${usage}`),
    });
}

// ==================== 규격정보 생성 ====================

export function useCreateBasicSpecification() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateSpecificationRequest) =>
            api.post<Specification>("/specifications", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [BASIC_SPECIFICATIONS_KEY] });
        },
    });
}

// ==================== 규격정보 수정 ====================

export function useUpdateBasicSpecification() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateSpecificationRequest }) =>
            api.put<Specification>(`/specifications/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [BASIC_SPECIFICATIONS_KEY] });
        },
    });
}

// ==================== 규격정보 삭제 ====================

export function useDeleteBasicSpecification() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => api.delete<void>(`/specifications/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [BASIC_SPECIFICATIONS_KEY] });
        },
    });
}

// ==================== 규격정보 정렬 ====================

export function useReorderBasicSpecifications() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (items: { id: string; sortOrder: number }[]) =>
            api.post<{ success: boolean }>("/specifications/reorder", items),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [BASIC_SPECIFICATIONS_KEY] });
        },
    });
}
