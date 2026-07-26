import { describe, expect, mock, test } from "bun:test";
import type { Server, ServerWebSocket } from "bun";
import type { WSData, WSMessage, WSRoomHandler } from "../../src/types";
import { WSRoom } from "../../src/ws-room";

/**
 * Create a mock ServerWebSocket.
 */
function createMockWS(data: WSData = {}): ServerWebSocket<WSData> {
    const subscriptions = new Set<string>();

    return {
        binaryType: "arraybuffer" as BinaryType,
        bufferedAmount: 0,
        close: mock(() => {}),
        cork: mock(() => {}),
        data,
        extensions: "",
        protocol: "",
        publish: mock(() => 1),
        readyState: 1,
        send: mock((_msg: string) => 1),
        subscribe: mock((topic: string) => subscriptions.add(topic)),
        unsubscribe: mock((topic: string) => subscriptions.delete(topic)),
        url: "ws://localhost:3000",
    } as unknown as ServerWebSocket<WSData>;
}

/**
 * Create a mock Server.
 */
function createMockServer(): Server {
    return {} as Server;
}

describe("WSRoom", () => {
    test("should create a room with default config", () => {
        const handler: WSRoomHandler = {};
        const room = new WSRoom(handler);

        expect(room.clientCount).toBe(0);
        expect(room.getConfig().maxPayloadLength).toBe(1024 * 1024);
        expect(room.getConfig().idleTimeout).toBe(30);
    });

    test("should create a room with custom config", () => {
        const handler: WSRoomHandler = {};
        const room = new WSRoom(handler, {
            backpressureLimit: 32768,
            idleTimeout: 60,
            maxPayloadLength: 2048,
        });

        expect(room.getConfig().maxPayloadLength).toBe(2048);
        expect(room.getConfig().idleTimeout).toBe(60);
        expect(room.getConfig().backpressureLimit).toBe(32768);
    });

    test("should track client connections", () => {
        const handler: WSRoomHandler = {};
        const room = new WSRoom(handler);
        const mockWs1 = createMockWS();
        const mockWs2 = createMockWS();

        room.handleOpen(mockWs1, createMockServer());
        expect(room.clientCount).toBe(1);

        room.handleOpen(mockWs2, createMockServer());
        expect(room.clientCount).toBe(2);
    });

    test("should track client disconnections", () => {
        const handler: WSRoomHandler = {};
        const room = new WSRoom(handler);
        const mockWs = createMockWS();

        const client = room.handleOpen(mockWs, createMockServer());
        expect(room.clientCount).toBe(1);

        room.handleClose(client, 1000, "Normal closure");
        expect(room.clientCount).toBe(0);
    });

    test("should call open handler on connection", () => {
        const openMock = mock();
        const handler: WSRoomHandler = { open: openMock };
        const room = new WSRoom(handler);
        const mockWs = createMockWS();

        room.handleOpen(mockWs, createMockServer());

        expect(openMock).toHaveBeenCalledTimes(1);
    });

    test("should call close handler on disconnection", () => {
        const closeMock = mock();
        const handler: WSRoomHandler = { close: closeMock };
        const room = new WSRoom(handler);
        const mockWs = createMockWS();

        const client = room.handleOpen(mockWs, createMockServer());
        room.handleClose(client, 1000, "Normal closure");

        expect(closeMock).toHaveBeenCalledTimes(1);
    });

    test("should broadcast messages to all clients", () => {
        const handler: WSRoomHandler = {};
        const room = new WSRoom(handler);
        const mockWs1 = createMockWS();
        const mockWs2 = createMockWS();

        room.handleOpen(mockWs1, createMockServer());
        room.handleOpen(mockWs2, createMockServer());

        const sent = room.broadcast({ content: "hello", type: "message" });

        expect(sent).toBe(2);
        expect(mockWs1.send).toHaveBeenCalledTimes(1);
        expect(mockWs2.send).toHaveBeenCalledTimes(1);
    });

    test("should exclude specific client from broadcast", () => {
        const handler: WSRoomHandler = {};
        const room = new WSRoom(handler);
        const mockWs1 = createMockWS();
        const mockWs2 = createMockWS();

        const client1 = room.handleOpen(mockWs1, createMockServer());
        room.handleOpen(mockWs2, createMockServer());

        const sent = room.broadcast({ type: "message" }, client1.id);

        expect(sent).toBe(1);
        expect(mockWs1.send).toHaveBeenCalledTimes(0);
        expect(mockWs2.send).toHaveBeenCalledTimes(1);
    });

    test("should parse JSON messages", () => {
        let receivedMessage: WSMessage | undefined;
        const handler: WSRoomHandler = {
            message: (_client, message) => {
                receivedMessage = message;
            },
        };
        const room = new WSRoom(handler);
        const mockWs = createMockWS();

        const client = room.handleOpen(mockWs, createMockServer());
        room.handleMessage(client, JSON.stringify({ action: "chat", payload: { text: "hello" } }));

        expect(receivedMessage).toBeDefined();
        expect(receivedMessage?.action).toBe("chat");
        expect(receivedMessage?.payload).toEqual({ text: "hello" });
        expect(receivedMessage?.timestamp).toBeDefined();
    });

    test("should handle invalid JSON as raw message", () => {
        let receivedMessage: WSMessage | undefined;
        const handler: WSRoomHandler = {
            message: (_client, message) => {
                receivedMessage = message;
            },
        };
        const room = new WSRoom(handler);
        const mockWs = createMockWS();

        const client = room.handleOpen(mockWs, createMockServer());
        room.handleMessage(client, "not valid json");

        expect(receivedMessage?.action).toBe("raw");
        expect(receivedMessage?.payload.content).toBe("not valid json");
    });

    test("should get client by ID", () => {
        const handler: WSRoomHandler = {};
        const room = new WSRoom(handler);
        const mockWs = createMockWS();

        const client = room.handleOpen(mockWs, createMockServer());
        const found = room.getClient(client.id);

        expect(found).toBe(client);
        expect(room.getClient("non-existent")).toBeUndefined();
    });

    test("should get all clients", () => {
        const handler: WSRoomHandler = {};
        const room = new WSRoom(handler);

        room.handleOpen(createMockWS(), createMockServer());
        room.handleOpen(createMockWS(), createMockServer());

        expect(room.getClients()).toHaveLength(2);
    });
});
