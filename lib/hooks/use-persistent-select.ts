"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";

export const PERSISTENT_STORAGE_KEYS = {
  SELECTED_IPO: "orbit_selected_ipo_id",
  APP_STATUS_FILTER: "orbit_app_status_filter",
  APP_FUNDING_FILTER: "orbit_app_funding_filter",
  APP_SORT: "orbit_app_sort_field",
  ALLOTMENT_SORT: "orbit_allotment_sort_field",
  IPO_STATUS_FILTER: "orbit_ipo_status_filter",
  IPO_CATEGORY_FILTER: "orbit_ipo_category_filter",
  MEMBER_ROLE_FILTER: "orbit_member_role_filter",
  MEMBER_STATUS_FILTER: "orbit_member_status_filter",
  PERFORMANCE_METRIC: "orbit_perf_metric_filter",
  HEALTH_CATEGORY: "orbit_health_category_filter",
  AUDIT_EVENT_FILTER: "orbit_audit_event_filter",
} as const;

export interface UsePersistentSelectOptions<T extends string = string> {
  key: string;
  paramName?: string;
  initialValue: T;
  availableValues?: T[];
  onValueChange?: (value: T) => void;
}

/**
 * Enterprise-grade persistent select hook.
 * Priority:
 * 1. User explicit interaction
 * 2. URL search param (if present and valid)
 * 3. LocalStorage saved ID (if valid against available options)
 * 4. Initial server/fallback value
 */
export function usePersistentSelect<T extends string = string>({
  key,
  paramName,
  initialValue,
  availableValues,
  onValueChange,
}: UsePersistentSelectOptions<T>): [T, (newValue: T, triggerCallback?: boolean) => void] {
  const searchParams = useSearchParams();
  const isInitializedRef = useRef(false);

  const getUrlValue = useCallback((): T | null => {
    if (!paramName) return null;
    const val = searchParams.get(paramName);
    if (val && (!availableValues || availableValues.includes(val as T))) {
      return val as T;
    }
    return null;
  }, [paramName, searchParams, availableValues]);

  const [selectedValue, setSelectedValue] = useState<T>(() => {
    const urlVal = getUrlValue();
    if (urlVal) return urlVal;

    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(key);
        if (stored && (!availableValues || availableValues.includes(stored as T))) {
          return stored as T;
        }
      } catch {}
    }

    return initialValue;
  });

  // Client hydration check
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    try {
      const urlVal = paramName ? searchParams.get(paramName) : null;
      const stored = localStorage.getItem(key);

      // If URL already has a valid value, persist it
      if (urlVal && (!availableValues || availableValues.includes(urlVal as T))) {
        localStorage.setItem(key, urlVal);
        setSelectedValue(urlVal as T);
        return;
      }

      // If localStorage has a valid stored value, restore it
      if (stored && (!availableValues || availableValues.includes(stored as T))) {
        if (stored !== selectedValue) {
          setSelectedValue(stored as T);
          if (onValueChange) {
            onValueChange(stored as T);
          }
        }
      } else if (availableValues && availableValues.length > 0 && stored && !availableValues.includes(stored as T)) {
        // Clear obsolete stored value
        localStorage.removeItem(key);
      }
    } catch {}
  }, [key, paramName, availableValues, searchParams, selectedValue, onValueChange]);

  // Validation when availableValues change (e.g. IPO deleted or options refreshed)
  useEffect(() => {
    if (!availableValues || availableValues.length === 0) return;

    if (selectedValue && !availableValues.includes(selectedValue)) {
      const fallback = availableValues[0];
      setSelectedValue(fallback);
      try {
        if (fallback) {
          localStorage.setItem(key, fallback);
        } else {
          localStorage.removeItem(key);
        }
      } catch {}
      if (onValueChange && fallback) {
        onValueChange(fallback);
      }
    }
  }, [availableValues, selectedValue, key, onValueChange]);

  // Setter function
  const setValue = useCallback(
    (newValue: T, triggerCallback = true) => {
      setSelectedValue(newValue);
      try {
        if (newValue) {
          localStorage.setItem(key, newValue);
        } else {
          localStorage.removeItem(key);
        }
      } catch {}

      if (triggerCallback && onValueChange) {
        onValueChange(newValue);
      }
    },
    [key, onValueChange]
  );

  return [selectedValue, setValue];
}
