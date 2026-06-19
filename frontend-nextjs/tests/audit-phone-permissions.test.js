"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
    canEditExistingAuditPhone,
    getEditableAuditPhoneInitialValue,
    buildAuditGenericUpdatePayload,
} = require("../lib/auditPhonePermissions");

test("only gerencia and desarrollador can edit an existing Audit phone", () => {
    assert.equal(canEditExistingAuditPhone("gerencia"), true);
    assert.equal(canEditExistingAuditPhone("Gerencia"), true);
    assert.equal(canEditExistingAuditPhone("desarrollador"), true);
    assert.equal(canEditExistingAuditPhone("Desarrollador"), true);

    for (const role of ["asesor", "supervisor", "auditor", "administrativo", "encargado", "recuperador", "independiente", "admin", "rr.hh", ""]) {
        assert.equal(canEditExistingAuditPhone(role), false, `${role} must not edit existing Audit phone`);
    }
});

test("authorized roles get real editable value but never a masked placeholder", () => {
    assert.equal(getEditableAuditPhoneInitialValue({ telefono: "1123456789" }, "gerencia"), "1123456789");
    assert.equal(getEditableAuditPhoneInitialValue({ telefono: "1123456789" }, "desarrollador"), "1123456789");
    assert.equal(getEditableAuditPhoneInitialValue({ telefono: "***" }, "gerencia"), "");
    assert.equal(getEditableAuditPhoneInitialValue({ telefono: "***" }, "desarrollador"), "");
});

test("generic Audit update payload excludes telefono and telefonoHistory", () => {
    const payload = buildAuditGenericUpdatePayload({
        status: "Mensaje enviado",
        datosExtra: "nota",
        telefono: "***",
        telefonoHistory: [{ newValue: "0000000000" }],
    });

    assert.deepEqual(payload, {
        status: "Mensaje enviado",
        datosExtra: "nota",
    });
});
