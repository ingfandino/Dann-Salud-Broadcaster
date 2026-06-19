"use strict";

const { __testables } = require("../src/services/contributionScraper.service");

function lastClosedMonths() {
    const now = new Date();
    const targets = [];
    for (let i = 1; i <= 3; i++) {
        let month = now.getMonth() + 1 - i;
        let year = now.getFullYear();
        if (month <= 0) {
            month += 12;
            year -= 1;
        }
        targets.push(`${String(month).padStart(2, "0")}/${year}`);
    }
    return targets;
}

describe("contributionScraper ARCA parser parity helpers", () => {
    test("multiple employers select latest valid contribution instead of first valid employer", () => {
        const [latestClosed, previousClosed] = lastClosedMonths();
        const employerA = __testables.buildContributionSummaryFromRows([
            { periodo: previousClosed, declaracion: "PRESENTADA", aporteOS: "PAGO", patronal: "PAGO" }
        ]);
        const employerB = __testables.buildContributionSummaryFromRows([
            { periodo: latestClosed, declaracion: "PRESENTADA", aporteOS: "PAGO", patronal: "PAGO" }
        ]);

        let selected = null;
        if (__testables.shouldReplaceSelectedEmployer(selected, employerA)) selected = { selectedEmployerIndex: 1, result: employerA };
        if (__testables.shouldReplaceSelectedEmployer(selected, employerB)) selected = { selectedEmployerIndex: 2, result: employerB };

        expect(selected.selectedEmployerIndex).toBe(2);
        expect(selected.result.lastPeriod).toBe(latestClosed);
    });

    test("invalid ARCA values are ignored for paid contribution and latest period", () => {
        const [latestClosed, previousClosed] = lastClosedMonths();
        const result = __testables.buildContributionSummaryFromRows([
            { periodo: latestClosed, declaracion: "PRESENTADA", aporteOS: "No presentada", patronal: "PAGO" },
            { periodo: null, declaracion: "PRESENTADA", aporteOS: "PAGO", patronal: "PAGO" },
            { periodo: "-", declaracion: "PRESENTADA", aporteOS: "PAGO", patronal: "PAGO" },
            { periodo: "", declaracion: "PRESENTADA", aporteOS: "PAGO", patronal: "PAGO" },
            { periodo: previousClosed, declaracion: "PRESENTADA", aporteOS: "PAGO", patronal: "PAGO" }
        ]);

        expect(result.lastPeriod).toBe(previousClosed);
        expect(result.last3ClosedMonthsPaidCount).toBe(1);
    });

    test("inicio laboral uses the oldest valid period with work activity", () => {
        const result = __testables.buildContributionSummaryFromRows([
            { periodo: "04/2026", declaracion: "PRESENTADA", aporteOS: "PAGO", patronal: "PAGO" },
            { periodo: "01/2025", declaracion: "PRESENTADA", aporteOS: "IMPAGO", patronal: "NO PRESENTADA" },
            { periodo: "-", declaracion: "PRESENTADA", aporteOS: "PAGO", patronal: "PAGO" }
        ]);

        expect(result.inicioLaboral).toBe("01/2025");
    });
});
