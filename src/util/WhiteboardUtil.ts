/**
 * Factory functions for creating Excalidraw-compatible element JSON.
 * Used by AI agents to programmatically add shapes to the whiteboard.
 */

/** Generates a random Excalidraw element ID. */
function randomId(): string {
    return Math.random().toString(36).slice(2, 12);
}

/** Shared defaults for every new element. */
function baseElement(type: string, x: number, y: number) {
    return {
        id             : randomId(),
        type,
        x,
        y,
        strokeColor    : '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle      : 'solid' as const,
        strokeWidth    : 2,
        strokeStyle    : 'solid' as const,
        roughness      : 1,
        opacity        : 100,
        angle          : 0,
        seed           : Math.floor(Math.random() * 2_000_000_000),
        version        : 1,
        versionNonce   : Math.floor(Math.random() * 2_000_000_000),
        isDeleted      : false,
        groupIds       : [] as string[],
        boundElements  : null,
        updated        : Date.now(),
        link           : null,
        locked         : false,
        roundness      : null,
    };
}

// ========================================================================== //
//                       P U B L I C   F A C T O R I E S                      //
// ========================================================================== //

/**
 * Creates a rectangle element.
 */
export function createRectangle(x: number, y: number, width: number, height: number,
                                color?: string) {
    return {
        ...baseElement('rectangle', x, y),
        width,
        height,
        ...(color ? { strokeColor: color } : {}),
        roundness: { type: 3 },
    };
}

/**
 * Creates an ellipse (circle) element.
 */
export function createEllipse(x: number, y: number, width: number, height: number,
                              color?: string) {
    return {
        ...baseElement('ellipse', x, y),
        width,
        height,
        ...(color ? { strokeColor: color } : {}),
        roundness: { type: 2 },
    };
}

/**
 * Creates a text element.
 */
export function createText(text: string, x: number, y: number, fontSize?: number,
                           color?: string) {
    const size = fontSize ?? 20;
    return {
        ...baseElement('text', x, y),
        text,
        fontSize       : size,
        fontFamily     : 1,       // Excalidraw hand-drawn font
        textAlign      : 'left',
        verticalAlign  : 'top',
        width          : text.length * size * 0.6,
        height         : size * 1.4,
        containerId    : null,
        originalText   : text,
        autoResize     : true,
        lineHeight     : 1.25,
        ...(color ? { strokeColor: color } : {}),
    };
}

/**
 * Creates an arrow element.
 */
export function createArrow(startX: number, startY: number,
                            endX: number, endY: number,
                            color?: string) {
    return {
        ...baseElement('arrow', startX, startY),
        width          : endX - startX,
        height         : endY - startY,
        points         : [[0, 0], [endX - startX, endY - startY]],
        startBinding   : null,
        endBinding     : null,
        startArrowhead : null,
        endArrowhead   : 'arrow',
        ...(color ? { strokeColor: color } : {}),
        roundness: { type: 2 },
    };
}

/**
 * Creates a line element.
 */
export function createLine(startX: number, startY: number,
                           endX: number, endY: number,
                           color?: string) {
    return {
        ...baseElement('line', startX, startY),
        width          : endX - startX,
        height         : endY - startY,
        points         : [[0, 0], [endX - startX, endY - startY]],
        startBinding   : null,
        endBinding     : null,
        startArrowhead : null,
        endArrowhead   : null,
        ...(color ? { strokeColor: color } : {}),
        roundness: { type: 2 },
    };
}

// ========================================================================== //
//                            P A R S E R                                     //
// ========================================================================== //

/** A single drawing command from an AI agent response. */
export type DrawCommand = {
    shape : 'rectangle' | 'ellipse' | 'text' | 'arrow' | 'line';
    x     : number;
    y     : number;
    width?: number;
    height?: number;
    endX? : number;
    endY? : number;
    text? : string;
    fontSize?: number;
    color?: string;
};

/**
 * Converts an array of draw commands into Excalidraw element objects.
 */
export function commandsToElements(commands: DrawCommand[]): Record<string, unknown>[] {
    return commands.map(cmd => {
        switch (cmd.shape) {
            case 'rectangle':
                return createRectangle(cmd.x, cmd.y, cmd.width ?? 100, cmd.height ?? 60, cmd.color);
            case 'ellipse':
                return createEllipse(cmd.x, cmd.y, cmd.width ?? 80, cmd.height ?? 80, cmd.color);
            case 'text':
                return createText(cmd.text ?? '', cmd.x, cmd.y, cmd.fontSize, cmd.color);
            case 'arrow':
                return createArrow(cmd.x, cmd.y, cmd.endX ?? cmd.x + 100, cmd.endY ?? cmd.y, cmd.color);
            case 'line':
                return createLine(cmd.x, cmd.y, cmd.endX ?? cmd.x + 100, cmd.endY ?? cmd.y, cmd.color);
        }
    });
}

/**
 * Extracts whiteboard draw commands from an AI response.
 * Looks for a fenced code block tagged `whiteboard-draw` containing JSON.
 *
 * Example format in AI response:
 * ```whiteboard-draw
 * [
 *   { "shape": "rectangle", "x": 50, "y": 50, "width": 200, "height": 100 },
 *   { "shape": "text", "x": 80, "y": 80, "text": "Hello" },
 *   { "shape": "arrow", "x": 50, "y": 200, "endX": 250, "endY": 200 }
 * ]
 * ```
 *
 * @returns parsed DrawCommand array, or null if no block found
 */
export function parseDrawCommands(responseText: string): DrawCommand[] | null {
    const regex = /```whiteboard-draw\s*\n([\s\S]*?)```/;
    const match = responseText.match(regex);
    if (!match?.[1]) {
        return null;
    }

    try {
        const parsed = JSON.parse(match[1]);
        if (!Array.isArray(parsed)) {
            return null;
        }
        return parsed as DrawCommand[];
    }
    catch {
        console.error('[WhiteboardUtil] Failed to parse draw commands');
        return null;
    }
}
