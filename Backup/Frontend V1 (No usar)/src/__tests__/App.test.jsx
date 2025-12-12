// frontend/src/__tests__/App.test.jsx

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "../App";

describe("App routing", () => {
    it("renderiza login por defecto", () => {
        render(
            <MemoryRouter initialEntries={["/login"]}>
                <App />
            </MemoryRouter>
        );
        expect(screen.getByText(/iniciar sesión/i)).toBeTruthy();
    });
});