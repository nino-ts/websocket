import { describe, expect, mock, test } from "bun:test";
import type { ServerWebSocket } from "bun";
import { WSClientImpl } from "../../src/ws-client";

/**
 * Create a mock ServerWebSocket.
 *
 * @returns Mock ServerWebSocket
 */
function createMockWS(): ServerWebSocket<{ id: string }> {
    const subscriptions = new Set<string>();

    return {
        binaryType: "arraybuffer" as BinaryType,
        bufferedAmount: 0,
        close: mock(() => {}),
        cork: mock(() => {}),
        data: { id: "test-client-1" },
        extensions: "",
        protocol: "",
        publish: mock(() => 1),
        readyState: 1,
        send: mock((_data: string) => 1),
        subscribe: mock((topic: string) => {
            subscriptions.add(topic);
        }),
        unsubscribe: mock((topic: string) => {
            subscriptions.delete(topic);
        }),
        url: "ws://localhost:3000",
    } as unknown as ServerWebSocket<{ id: string }>;
}

describe("WSClientImpl", () => {
    test("should generate a unique ID", () => {
        const mockWs = createMockWS();
        const client = new WSClientImpl(mockWs, { id: "test-1" });

        expect(client.id).toBeDefined();
        expect(typeof client.id).toBe("string");
        expect(client.id).toContain("ws-client-");
    });

    test("should store client data", () => {
        const mockWs = createMockWS();
        const data = { roomId: "chat", userId: 123 };
        const client = new WSClientImpl(mockWs, data);

        expect(client.data).toEqual(data);
    });

    test("should send messages", () => {
        const mockWs = createMockWS();
        const client = new WSClientImpl(mockWs, { id: "test" });

        const result = client.send({ content: "hello", type: "message" });

        expect(result).toBe(true);
        expect(mockWs.send).toHaveBeenCalledTimes(1);
    });

    test("should close connection", () => {
        const mockWs = createMockWS();
        const client = new WSClientImpl(mockWs, { id: "test" });

        client.close(1000, "Normal closure");

        expect(mockWs.close).toHaveBeenCalledWith(1000, "Normal closure");
    });

    test("should subscribe to topics", () => {
        const mockWs = createMockWS();
        const client = new WSClientImpl(mockWs, { id: "test" });

        client.subscribe("chat");
        client.subscribe("notifications");

        expect(client.isSubscribed("chat")).toBe(true);
        expect(client.isSubscribed("notifications")).toBe(true);
        expect(client.isSubscribed("unknown")).toBe(false);
        expect(client.topics()).toEqual(["chat", "notifications"]);
    });

    test("should unsubscribe from topics", () => {
        const mockWs = createMockWS();
        const client = new WSClientImpl(mockWs, { id: "test" });

        client.subscribe("chat");
        expect(client.isSubscribed("chat")).toBe(true);

        client.unsubscribe("chat");
        expect(client.isSubscribed("chat")).toBe(false);
        expect(client.topics()).toEqual([]);
    });
});
