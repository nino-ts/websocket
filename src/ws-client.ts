import type { ServerWebSocket } from "bun";
import type { WSClient, WSData } from "../types";

/**
 * Unique ID generator for WebSocket clients.
 */
let clientIdCounter = 0;

/**
 * Generate a unique client ID.
 *
 * @returns Unique client identifier
 */
function generateClientId(): string {
    return `ws-client-${++clientIdCounter}-${Date.now()}`;
}

/**
 * WebSocket client implementation.
 *
 * Wraps Bun's ServerWebSocket with convenience methods
 * for sending messages, managing subscriptions, and handling
 * connection lifecycle.
 *
 * @typeParam T - The type of data attached to the client
 */
export class WSClientImpl<T extends WSData = WSData> implements WSClient<T> {
    /**
     * Unique client identifier
     */
    public readonly id: string;

    /**
     * Data attached to this client
     */
    public data: T;

    /**
     * The underlying ServerWebSocket
     */
    public readonly ws: ServerWebSocket<T>;

    /**
     * Set of topics this client is subscribed to
     */
    private subscribedTopics: Set<string>;

    /**
     * Create a new WebSocket client.
     *
     * @param ws - The underlying ServerWebSocket
     * @param data - Initial client data
     */
    constructor(ws: ServerWebSocket<T>, data: T) {
        this.id = generateClientId();
        this.ws = ws;
        this.data = data;
        this.subscribedTopics = new Set();
    }

    /**
     * Send a message to this client.
     *
     * @param message - The message to send
     * @returns Whether the send was successful
     */
    public send(message: Record<string, unknown>): boolean {
        const payload = typeof message === "string" ? message : JSON.stringify(message);
        return this.ws.send(payload) !== 0;
    }

    /**
     * Close the connection.
     *
     * @param code - Close code
     * @param reason - Close reason
     */
    public close(code = 1000, reason = ""): void {
        this.ws.close(code, reason);
    }

    /**
     * Subscribe to a topic/room.
     *
     * @param topic - The topic name
     */
    public subscribe(topic: string): void {
        this.ws.subscribe(topic);
        this.subscribedTopics.add(topic);
    }

    /**
     * Unsubscribe from a topic/room.
     *
     * @param topic - The topic name
     */
    public unsubscribe(topic: string): void {
        this.ws.unsubscribe(topic);
        this.subscribedTopics.delete(topic);
    }

    /**
     * Get the topics this client is subscribed to.
     *
     * @returns Array of topic names
     */
    public topics(): string[] {
        return Array.from(this.subscribedTopics);
    }

    /**
     * Check if the client is subscribed to a topic.
     *
     * @param topic - The topic name
     * @returns Whether subscribed
     */
    public isSubscribed(topic: string): boolean {
        return this.subscribedTopics.has(topic);
    }
}
