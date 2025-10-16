// frontend/src/__tests__/AuthContext.test.jsx

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { MemoryRouter } from "react-router-dom";

describe("AuthContext", () => {
    it("permite login y logout", async () => {
        const wrapper = ({ children }) => (
            <MemoryRouter>
                <AuthProvider>{children}</AuthProvider>
            </MemoryRouter>
        );

        const { result } = renderHook(() => useAuth(), { wrapper });

        act(() => {
            result.current.setUser({ email: "demo@test.com" });
        });

        expect(result.current.user.email).toBe("demo@test.com");

        act(() => {
            result.current.logout();
        });

        expect(result.current.user).toBe(null);
    });
});