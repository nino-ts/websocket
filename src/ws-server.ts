import type { WSData, WSRoomConfig, WSRoomHandler } from "../types";
import { createWSHandler } from "./ws-handler";
import { WSRoom } from "./ws-room";

/**
 * Create a WebSocket room and its Bun.serve handler.
 *
 * Convenience function that creates a WSRoom and returns
 * both the room and its compatible handler for Bun.serve.
 *
 * @typeParam T - The type of data attached to each client
 * @param handler - The room handler implementation
 * @param config - Room configuration options
 * @returns Object containing the room and bunHandler
 */
export function createRoom<T extends WSData = WSData>(
    handler: WSRoomHandler<T>,
    config?: WSRoomConfig<T>,
): { room: WSRoom<T>; bunHandler: ReturnType<typeof createWSHandler<T>> } {
    const room = new WSRoom(handler, config);
    const bunHandler = createWSHandler(room);

    return { bunHandler, room };
}

/**
 * Build a WebSocket handler object from lifecycle functions.
 *
 * @typeParam T - The type of data attached to each client
 * @param handler - The handler implementation
 * @returns Handler object compatible with createRoom
 */
export function wsHandler<T extends WSData = WSData>(handler: WSRoomHandler<T>): WSRoomHandler<T> {
    return handler;
}
