import type { ServerWebSocket } from "bun";
import type { WSData } from "../types";
import type { WSRoom } from "./ws-room";

/**
 * Create a WebSocket handler compatible with Bun.serve.
 *
 * This function takes a WSRoom and returns the handler object
 * that Bun.serve expects in the `websocket` option.
 *
 * @typeParam T - The type of data attached to each client
 * @param room - The WSRoom instance
 * @returns Bun.serve compatible websocket handler
 */
export function createWSHandler<T extends WSData = WSData>(
    room: WSRoom<T>,
): {
    open: (ws: ServerWebSocket<T>) => void;
    message: (ws: ServerWebSocket<T>, message: string | Buffer) => void;
    close: (ws: ServerWebSocket<T>, code: number, reason: string) => void;
    ping: (ws: ServerWebSocket<T>, data: Buffer) => void;
    pong: (ws: ServerWebSocket<T>, data: Buffer) => void;
    drain: (ws: ServerWebSocket<T>) => void;
} {
    return {
        /**
         * Called when a connection is closed.
         *
         * @param ws - The ServerWebSocket
         * @param code - Close code
         * @param reason - Close reason
         */
        close(ws: ServerWebSocket<T>, code: number, reason: string): void {
            const client = room.getClient(ws.data?.id as string);
            if (client) {
                room.handleClose(client, code, reason);
            }
        },

        /**
         * Called when backpressure is relieved.
         *
         * @param ws - The ServerWebSocket
         */
        drain(ws: ServerWebSocket<T>): void {
            const client = room.getClient(ws.data?.id as string);
            if (client) {
                // Handler drain hook could be called here
            }
        },

        /**
         * Called when a message is received.
         *
         * @param ws - The ServerWebSocket
         * @param message - The message data
         */
        message(ws: ServerWebSocket<T>, message: string | Buffer): void {
            const client = room.getClient(ws.data?.id as string);
            if (client) {
                room.handleMessage(client, message);
            }
        },
        /**
         * Called when a new WebSocket connection is opened.
         *
         * @param ws - The ServerWebSocket
         */
        open(ws: ServerWebSocket<T>): void {
            const server = (ws as unknown as { server: Server }).server;
            room.handleOpen(ws, server);
        },

        /**
         * Called when a ping frame is received.
         *
         * @param ws - The ServerWebSocket
         * @param data - Ping data
         */
        ping(ws: ServerWebSocket<T>, data: Buffer): void {
            const client = room.getClient(ws.data?.id as string);
            if (client) {
                room.handlePing(client, data);
            }
        },

        /**
         * Called when a pong frame is received.
         *
         * @param ws - The ServerWebSocket
         * @param data - Pong data
         */
        pong(ws: ServerWebSocket<T>, data: Buffer): void {
            const client = room.getClient(ws.data?.id as string);
            if (client) {
                room.handlePong(client, data);
            }
        },
    };
}
