"use strict";

const { normalizeCuil, normalizePhone, rotateCanonicalPhones } = require("../src/utils/excelHelpers");

describe("affiliate import normalization", () => {
    test.each([
        ["20123456783", "20123456783"],
        ["20-12345678-3", "20123456783"],
        ["20.12345678.3", "20123456783"],
        [" 20 12345678 3 ", "20123456783"]
    ])("normalizes CUIL %p", (input, expected) => {
        expect(normalizeCuil(input)).toBe(expected);
    });

    test.each(["123", "", null, undefined])("rejects invalid CUIL %p", input => {
        expect(normalizeCuil(input)).toBeNull();
    });

    test("normalizes phones to digits only", () => {
        expect(normalizePhone("+54 9 (11) 2345-6789")).toBe("5491123456789");
    });

    test("rotates a new phone through the three canonical slots", () => {
        expect(rotateCanonicalPhones(
            ["1111111111", "2222222222", "3333333333"],
            ["4444444444"]
        )).toEqual(["4444444444", "1111111111", "2222222222"]);
    });

    test("returns null when every incoming phone already exists", () => {
        expect(rotateCanonicalPhones(
            ["1111111111", "2222222222", "3333333333"],
            ["2222222222", "1111111111"]
        )).toBeNull();
    });

    test("uses extra new phones only to fill empty canonical slots", () => {
        expect(rotateCanonicalPhones(
            ["1111111111"],
            ["4444444444", "5555555555", "6666666666"]
        )).toEqual(["4444444444", "1111111111", "5555555555"]);
    });
});
