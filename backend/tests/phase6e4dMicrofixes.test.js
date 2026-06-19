const {
    canAccessSendJob,
    canControlSendJob,
} = require("../src/utils/sendJobAccess");
const {
    filterSocialHealthItems,
    matchesSocialHealthSearch,
} = require("../src/utils/socialHealthSearch");
const {
    canViewAuditPhone,
    maskAuditPhoneIfNeeded,
} = require("../src/utils/auditPhoneVisibility");

describe("Phase 6E.4D micro-fixes", () => {
    describe("Independiente Mensajería Masiva ownership", () => {
        const owner = { _id: "user-1", role: "independiente" };
        const otherUser = { _id: "user-2", role: "independiente" };
        const ownJob = { createdBy: { _id: "user-1" } };
        const foreignJob = { createdBy: { _id: "user-2" } };

        test("independiente can access and control own campaign", () => {
            expect(canAccessSendJob(owner, ownJob)).toBe(true);
            expect(canControlSendJob(owner, ownJob)).toBe(true);
        });

        test("independiente cannot access or control another user's campaign", () => {
            expect(canAccessSendJob(owner, foreignJob)).toBe(false);
            expect(canControlSendJob(owner, foreignJob)).toBe(false);
            expect(canAccessSendJob(otherUser, ownJob)).toBe(false);
        });

        test("supervisor can access team campaign without becoming global admin", () => {
            const supervisor = { _id: "sup-1", role: "supervisor", numeroEquipo: "7" };
            const teamJob = { createdBy: { _id: "advisor-1", numeroEquipo: "7" } };
            const otherTeamJob = { createdBy: { _id: "advisor-2", numeroEquipo: "9" } };

            expect(canAccessSendJob(supervisor, teamJob)).toBe(true);
            expect(canAccessSendJob(supervisor, otherTeamJob)).toBe(false);
        });
    });

    describe("Searchable Obra Social Anterior", () => {
        const items = [
            { code: 1008, name: "O.S. DE EMPLEADOS DE COMERCIO" },
            { code: 126205, name: "OSECAC" },
            { code: 3405, name: "OBRA SOCIAL SIN RELACION" },
        ];

        test("searches by case-insensitive and accent-tolerant name substring", () => {
            const result = filterSocialHealthItems(items, " comercio ");
            expect(result).toHaveLength(1);
            expect(result[0].code).toBe(1008);
        });

        test("searches by exact, partial, and padded code without matching names by digits", () => {
            expect(matchesSocialHealthSearch({ code: 1008, codePadded: "001008", name: "Comercio" }, "1008")).toBe(true);
            expect(matchesSocialHealthSearch({ code: 1008, codePadded: "001008", name: "Comercio" }, "0010")).toBe(true);
            expect(matchesSocialHealthSearch({ code: 126205, codePadded: "126205", name: "OSECAC" }, "126")).toBe(true);
            expect(matchesSocialHealthSearch({ code: 3405, codePadded: "003405", name: "Plan 1008 falso" }, "1008")).toBe(false);
        });
    });

    describe("Seguimiento phone visibility by sale assignment", () => {
        const assignedAdvisor = { _id: "user-1", role: "supervisor" };
        const assignedSupervisor = { _id: "sup-1", role: "supervisor" };
        const unrelatedSupervisor = { _id: "sup-2", role: "supervisor" };
        const sale = {
            telefono: "5491112345678",
            asesor: { _id: "user-1" },
            supervisorSnapshot: { _id: "sup-1" },
        };

        test("current supervisor assigned as sale advisor sees phone after role change", () => {
            expect(canViewAuditPhone(assignedAdvisor, sale, false)).toBe(true);
            expect(maskAuditPhoneIfNeeded(sale, assignedAdvisor, false).telefono).toBe("5491112345678");
        });

        test("assigned supervisor sees phone", () => {
            expect(canViewAuditPhone(assignedSupervisor, sale, false)).toBe(true);
        });

        test("unrelated supervisor remains masked", () => {
            const masked = maskAuditPhoneIfNeeded(sale, unrelatedSupervisor, false);
            expect(masked.telefono).toBeNull();
            expect(masked.telefonoMasked).toBe("***");
            expect(masked.canViewTelefono).toBe(false);
        });

        test("same display name is not enough without matching ID", () => {
            const sameNameDifferentId = { _id: "different-id", role: "supervisor", nombre: "user-1" };
            expect(canViewAuditPhone(sameNameDifferentId, sale, false)).toBe(false);
        });
    });
});
