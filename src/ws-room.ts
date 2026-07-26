import type { Server } from "bun";
import type { WSClient, WSData, WSMessage, WSRoomConfig, WSRoomHandler } from "../types";
import { WSClientImpl } from "./ws-client";

/**
 * WebSocket room manager.
 *
 * Manages a group of WebSocket connections with pub/sub
 * support, message broadcasting, and lifecycle hooks.
 *
 * @typeParam T - The type of data attached to each client
 */
export class WSRoom<T extends WSData = WSData> {
    /**
     * Map of connected clients
     */
    private clients: Map<string, WSClient<T>>;

    /**
     * Room handler implementation
     */
    private handler: WSRoomHandler<T>;

    /**
     * Room configuration
     */
    private config: WSRoomConfig<T>;

    /**
     * Create a new WebSocket room.
     *
     * @param handler - The room handler implementation
     * @param config - Room configuration options
     */
    constructor(handler: WSRoomHandler<T>, config: WSRoomConfig<T> = {}) {
        this.clients = new Map();
        this.server = null;
        this.handler = handler;
        this.config = {
            backpressureLimit: config.backpressureLimit ?? 16384,
            closeOnBackpressureLimit: config.closeOnBackpressureLimit ?? false,
            idleTimeout: config.idleTimeout ?? 30,
            maxPayloadLength: config.maxPayloadLength ?? 1024 * 1024,
            sendPings: config.sendPings ?? true,
        };
    }

    /**
     * Get the room configuration.
     *
     * @returns The room configuration
     */
    public getConfig(): WSRoomConfig<T> {
        return this.config;
    }

    /**
     * Get the number of connected clients.
     *
     * @returns Number of connected clients
     */
    public get clientCount(): number {
        return this.clients.size;
    }

    /**
     * Get a client by ID.
     *
     * @param id - The client ID
     * @returns The client or undefined if not found
     */
    public getClient(id: string): WSClient<T> | undefined {
        return this.clients.get(id);
    }

    /**
     * Get all connected clients.
     *
     * @returns Array of clients
     */
    public getClients(): WSClient<T>[] {
        return Array.from(this.clients.values());
    }

    /**
     * Broadcast a message to all clients in the room.
     *
     * @param message - The message to broadcast
     * @param excludeId - Optional client ID to exclude
     * @returns Number of clients the message was sent to
     */
    public broadcast(message: Record<string, unknown>, excludeId?: string): number {
        let sent = 0;
        const payload = JSON.stringify(message);

        for (const client of this.clients.values()) {
            if (client.id !== excludeId) {
                client.ws.send(payload);
                sent++;
            }
        }

        return sent;
    }

    /**
     * Handle a new client connection.
     *
     * @param ws - The ServerWebSocket
     * @param server - The Bun server instance
     * @returns The created WSClient
     */
    public handleOpen(ws: ServerWebSocket<T>, _server: Server): WSClient<T> {
        const client = new WSClientImpl(ws, ws.data as T);
        this.clients.set(client.id, client);

        // Call handler
        if (this.handler.open) {
            void this.handler.open(client);
        }

        return client;
    }

    /**
     * Handle a message from a client.
     *
     * @param client - The client that sent the message
     * @param message - The raw message data
     */
    public handleMessage(client: WSClient<T>, message: string | Buffer): void {
        let parsed: WSMessage;

        try {
            const data = typeof message === "string" ? message : message.toString();
            parsed = JSON.parse(data) as WSMessage;
            parsed.timestamp = Date.now();
        } catch {
            // If parsing fails, wrap as a raw message
            parsed = {
                action: "raw",
                payload: {
                    content: typeof message === "string" ? message : message.toString(),
                },
                timestamp: Date.now(),
            };
        }

        // Call handler
        if (this.handler.message) {
            void this.handler.message(client, parsed);
        }
    }

    /**
     * Handle a client disconnection.
     *
     * @param client - The disconnected client
     * @param code - Close code
     * @param reason - Close reason
     */
    public handleClose(client: WSClient<T>, code: number, reason: string): void {
        // Remove from clients map
        this.clients.delete(client.id);

        // Clean up subscriptions
        for (const topic of client.topics()) {
            client.unsubscribe(topic);
        }

        // Call handler
        if (this.handler.close) {
            void this.handler.close(client, code, reason);
        }
    }

    /**
     * Handle a ping frame.
     *
     * @param client - The client that sent the ping
     * @param data - Ping data
     */
    public handlePing(client: WSClient<T>, data: Buffer): void {
        if (this.handler.ping) {
            void this.handler.ping(client, data);
        }
    }

    /**
     * Handle a pong frame.
     *
     * @param client - The client that sent the pong
     * @param data - Pong data
     */
    public handlePong(client: WSClient<T>, data: Buffer): void {
        if (this.handler.pong) {
            void this.handler.pong(client, data);
        }
    }
}
