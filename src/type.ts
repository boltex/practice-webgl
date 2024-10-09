import { Point } from "./maths";
export type Renderable = {
    sprite: string;
    oldPosition: Point;
    position: Point;
    frame: Point;
    flip: boolean;
    blendmode: number;
    options: Record<string, any>;
};

export type RenderableLayer = {
    blendmode: number;
    objs: Renderable[];
};

export type RenderableLayers = {
    layers: RenderableLayer[];
};

export type TParameters =
    | {
        uniform: true;
        location: WebGLUniformLocation;
        type: number;
    }
    | {
        uniform: false;
        location: number;
        type: number;
    };

export type TCommand = {
    order: number;
    x: number;
    y: number;
    entityId: number;
}

export type TEntity = {
    id: number;
    // states
    type: number;
    hitPoints: number;
    state: number;
    x: number;
    y: number;
    orientation: number;
    frameIndex: number;
    // Ten queuable commands
    orderQty: number;
    orderIndex: number;
    orderPool: [
        TCommand, TCommand, TCommand, TCommand, TCommand,
        TCommand, TCommand, TCommand, TCommand, TCommand
    ];
    active: boolean;
}
