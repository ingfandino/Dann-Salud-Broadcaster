/**
 * ============================================================
 * HOOK: useSocialHealthList
 * ============================================================
 * Fetches and caches the official AFIP T05 Social Health catalog.
 * Provides dropdown-compatible options with backward-compatibility
 * support for legacy saved values.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";

export interface SocialHealthOption {
    code: number;
    codePadded: string;
    name: string;
    label: string;
    value: string;
}

interface UseSocialHealthListReturn {
    options: SocialHealthOption[];
    loading: boolean;
    error: string | null;
    getOptionsWithFallback: (currentValue?: string | null) => SocialHealthOption[];
    findByValue: (value?: string | null) => SocialHealthOption | undefined;
}

/* Module-level cache to share across component instances */
let globalCache: SocialHealthOption[] | null = null;
let globalPromise: Promise<SocialHealthOption[]> | null = null;

function fetchSocialHealthList(): Promise<SocialHealthOption[]> {
    if (globalCache) return Promise.resolve(globalCache);
    if (globalPromise) return globalPromise;

    globalPromise = api.socialHealthList
        .list()
        .then((res: any) => {
            const items: SocialHealthOption[] = (res.data?.data || []).map(
                (item: any) => ({
                    code: item.code,
                    codePadded: item.codePadded,
                    name: item.name,
                    label: item.name,
                    value: item.name,
                })
            );
            globalCache = items;
            return items;
        })
        .catch((err) => {
            console.error("Failed to load SocialHealthList:", err);
            throw err;
        })
        .finally(() => {
            globalPromise = null;
        });

    return globalPromise;
}

export function useSocialHealthList(): UseSocialHealthListReturn {
    const [options, setOptions] = useState<SocialHealthOption[]>(globalCache || []);
    const [loading, setLoading] = useState(!globalCache);
    const [error, setError] = useState<string | null>(null);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        if (globalCache) {
            setOptions(globalCache);
            setLoading(false);
            return;
        }

        setLoading(true);
        fetchSocialHealthList()
            .then((items) => {
                if (mounted.current) {
                    setOptions(items);
                    setError(null);
                }
            })
            .catch((err) => {
                if (mounted.current) {
                    setError("No se pudo cargar el catálogo de obras sociales");
                }
            })
            .finally(() => {
                if (mounted.current) setLoading(false);
            });

        return () => {
            mounted.current = false;
        };
    }, []);

    /**
     * Returns the standard options plus any current value that is not
     * already present (backward compatibility for legacy saved names).
     */
    const getOptionsWithFallback = useCallback(
        (currentValue?: string | null): SocialHealthOption[] => {
            if (!currentValue || currentValue.trim() === "") return options;
            const normalizedCurrent = currentValue.trim();
            const exists = options.some(
                (o) => o.value.toLowerCase() === normalizedCurrent.toLowerCase()
            );
            if (exists) return options;
            const fallback: SocialHealthOption = {
                code: -1,
                codePadded: "------",
                name: normalizedCurrent,
                label: `${normalizedCurrent} (valor previo)`,
                value: normalizedCurrent,
            };
            return [fallback, ...options];
        },
        [options]
    );

    /**
     * Find an option by its stored value (name).
     */
    const findByValue = useCallback(
        (value?: string | null): SocialHealthOption | undefined => {
            if (!value) return undefined;
            return options.find(
                (o) => o.value.toLowerCase() === value.trim().toLowerCase()
            );
        },
        [options]
    );

    return { options, loading, error, getOptionsWithFallback, findByValue };
}
