
"use client";

import { useState, useEffect } from 'react';

function getValueFromLocalStorage<T>(key: string) {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.warn(`Error reading localStorage key “${key}”:`, error);
        return null;
    }
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        const item = getValueFromLocalStorage<T>(key);
        return item ?? initialValue;
    });
    
    useEffect(() => {
        const item = getValueFromLocalStorage<T>(key);
        if (item !== null) {
            setStoredValue(item);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    const setValue = (value: T) => {
        if (typeof window === 'undefined') {
            console.warn(
                `Tried setting localStorage key “${key}” even though environment is not a client`,
            );
        }

        try {
            window.localStorage.setItem(key, JSON.stringify(value));
            setStoredValue(value);
            window.dispatchEvent(new Event('local-storage'));
        } catch (error) {
            console.warn(`Error setting localStorage key “${key}”:`, error);
        }
    };

    useEffect(() => {
        const handleStorageChange = () => {
            const item = getValueFromLocalStorage<T>(key);
            if (item !== null) {
                setStoredValue(item);
            }
        };
        window.addEventListener('local-storage', handleStorageChange);
        return () => {
            window.removeEventListener('local-storage', handleStorageChange);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return [storedValue, setValue];
}

    