/**
 * Utility for generating deterministic room IDs for direct chats
 * Ensures that the same two users always get the same room ID
 */

export class RoomIdGenerator {
    /**
     * Generate a deterministic room ID for a direct chat between two users
     * @param userId1 - First user ID
     * @param userId2 - Second user ID
     * @returns Deterministic room ID
     */
    static generateDirectRoomId(userId1: string, userId2: string): string {
        // Sort user IDs alphabetically to ensure consistency
        const sortedIds = [userId1, userId2].sort();
        return `room_${sortedIds[0]}_${sortedIds[1]}`;
    }

    /**
     * Generate a unique room ID for group chats
     * @param participants - Array of user IDs
     * @returns Unique room ID
     */
    static generateGroupRoomId(participants: string[]): string {
        const sortedIds = [...participants].sort();
        const timestamp = Date.now();
        return `group_${sortedIds.join('_')}_${timestamp}`;
    }

    /**
     * Check if a room ID is for a direct chat
     * @param roomId - Room ID to check
     * @returns True if direct chat, false otherwise
     */
    static isDirectRoom(roomId: string): boolean {
        return roomId.startsWith('room_') && !roomId.startsWith('group_');
    }

    /**
     * Extract participant IDs from a direct room ID
     * @param roomId - Direct room ID
     * @returns Array of user IDs or null if not a valid direct room
     */
    static extractParticipants(roomId: string): string[] | null {
        if (!this.isDirectRoom(roomId)) {
            return null;
        }
        const parts = roomId.replace('room_', '').split('_');
        return parts.length === 2 ? parts : null;
    }
}
