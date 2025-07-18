import { QuickRef } from "./QuickRef";

describe("QuickRef", () => {
    describe("initializes refs from", () => {
        it("a single reference object param", () => {
            const input    = { "a": 1 };
            const quickRef = new QuickRef(input);

            expect(quickRef.refs).toEqual(input);
        });

        it("multiple, non-overlapping reference object params", () => {
            const inputs   = [{ "a": 1 }, { "b": 2 }];
            const quickRef = new QuickRef(...inputs);

            expect(quickRef.refs).toEqual({ "a": 1, "b": 2 });
        });

        it("multiple, overlapping reference object params", () => {
            const inputs   = [{ "a": { "b": 1 } }, { "a": { "c": 2 } }];
            const quickRef = new QuickRef(...inputs);

            expect(quickRef.refs).toEqual({ "a": { "b": 1, "c": 2 } });
        });

        it("multiple, conflicting reference object params", () => {
            const inputs   = [{ "a": 1 }, { "a": 2 }];
            const quickRef = new QuickRef(...inputs);

            expect(quickRef.refs).toEqual({ "a": 2 });
        });

        it("no params", () => {
            const quickRef = new QuickRef();

            expect(quickRef.refs).toEqual({});
        });
    });

    it("allows read-only access to refs", () => {
        const quickRef = new QuickRef();

        expect(() => (quickRef.refs = {})).toThrow();
    });

    it("adds reference objects after initialization", () => {
        const quickRef = new QuickRef({ "a": 1 });

        quickRef.add({ "b": 2 });

        expect(quickRef.refs).toEqual({ "a": 1, "b": 2 });
    });

    it("does nothing when adding nothing", () => {
        const input    = { "a": 1 };
        const quickRef = new QuickRef(input);

        quickRef.add();

        expect(quickRef.refs).toEqual(input);
    });

    it("overwrites arrays at the same address", () => {
        const quickRef = new QuickRef({ "a": [1] });

        quickRef.add({ "a": [2] });

        expect(quickRef.refs).toEqual({ "a": [2] });
    });

    describe("looks up refs with", () => {
        it("valid, shallow addresses", () => {
            const quickRef = new QuickRef({ "a": 1 });

            expect(quickRef.lookup("a")).toBe(1);
        });

        it("valid, deep addresses", () => {
            const quickRef = new QuickRef({ "a": { "b": { "c": 1 } } });

            expect(quickRef.lookup("a", "b", "c")).toBe(1);
        });

        it("no address", () => {
            const input    = { "a": 1 };
            const quickRef = new QuickRef(input);

            expect(quickRef.lookup()).toEqual(input);
        });
    });

    describe("throws for ref lookups with", () => {
        it("invalid addresses", () => {
            const quickRef = new QuickRef({ "a": { "b": 1 } });

            expect(() => quickRef.lookup("a", "b", "c")).toThrow(/Invalid address/);
        });
    });
});
