/**
 * WebSocket handler function types.
 *
 * Defines the contract for WebSocket room handlers
 * that manage client connections and message routing.
 */

import type { ServerWebSocket } from "bun";

/**
 * Data attached to a WebSocket connection.
 *
 * Generic type for per-connection metadata.
 */
export type WSData = Record<string, unknown>;

/**
 * WebSocket message type.
 *
 * Represents a parsed message from a client.
 */
export interface WSMessage {
    /**
     * The action type (e.g., 'message', 'subscribe', 'ping')
     */
    action: string;

    /**
     * The message payload
     */
    payload: Record<string, unknown>;

    /**
     * The room/channel name
     */
    room?: string;

    /**
     * Message timestamp (auto-set on receive)
     */
    timestamp?: number;
}

/**
 * WebSocket client wrapper.
 *
 * Provides convenience methods for interacting with
 * the underlying ServerWebSocket.
 */
export interface WSClient<T extends WSData = WSData> {
    /**
     * Unique client identifier
     */
    readonly id: string;

    /**
     * Data attached to this client
     */
    data: T;

    /**
     * The underlying ServerWebSocket
     */
    readonly ws: ServerWebSocket<T>;

    /**
     * Send a message to this client.
     *
     * @param message - The message to send
     * @returns Whether the send was successful
     */
    send(message: Record<string, unknown>): boolean;

    /**
     * Close the connection.
     *
     * @param code - Close code
     * @param reason - Close reason
     */
    close(code?: number, reason?: string): void;

    /**
     * Subscribe to a topic/room.
     *
     * @param topic - The topic name
     */
    subscribe(topic: string): void;

    /**
     * Unsubscribe from a topic/room.
     *
     * @param topic - The topic name
     */
    unsubscribe(topic: string): void;

    /**
     * Get the topics this client is subscribed to.
     *
     * @returns Array of topic names
     */
    topics(): string[];

    /**
     * Check if the client is subscribed to a topic.
     *
     * @param topic - The topic name
     * @returns Whether subscribed
     */
    isSubscribed(topic: string): boolean;
}

/**
 * WebSocket room handler interface.
 *
 * Defines lifecycle hooks for WebSocket rooms.
 */
export interface WSRoomHandler<T extends WSData = WSData> {
    /**
     * Called when a client connects.
     *
     * @param client - The connected client
     */
    open?(client: WSClient<T>): void | Promise<void>;

    /**
     * Called when a message is received.
     *
     * @param client - The client that sent the message
     * @param message - The received message
     */
    message?(client: WSClient<T>, message: WSMessage): void | Promise<void>;

    /**
     * Called when a client disconnects.
     *
     * @param client - The disconnected client
     * @param code - Close code
     * @param reason - Close reason
     */
    close?(client: WSClient<T>, code: number, reason: string): void | Promise<void>;

    /**
     * Called when a ping frame is received.
     *
     * @param client - The client that sent the ping
     * @param data - Ping data
     */
    ping?(client: WSClient<T>, data: Buffer): void | Promise<void>;

    /**
     * Called when a pong frame is received.
     *
     * @param client - The client that sent the pong
     * @param data - Pong data
     */
    pong?(client: WSClient<T>, data: Buffer): void | Promise<void>;

    /**
     * Called when backpressure is relieved.
     *
     * @param client - The client
     */
    drain?(client: WSClient<T>): void | Promise<void>;
}

/**
 * WebSocket room configuration.
 */
export interface WSRoomConfig<_T extends WSData = WSData> {
    /**
     * Maximum WebSocket message size in bytes.
     *
     * @default 1024 * 1024 (1MB)
     */
    maxPayloadLength?: number;

    /**
     * Seconds before idle timeout.
     *
     * @default 30
     */
    idleTimeout?: number;

    /**
     * Bytes of queued messages before backpressure.
     *
     * @default 16384
     */
    backpressureLimit?: number;

    /**
     * Whether to close when backpressure limit hit.
     *
     * @default false
     */
    closeOnBackpressureLimit?: boolean;

    /**
     * Whether to send ping frames to keep connection alive.
     *
     * @default true
     */
    sendPings?: boolean;
}
