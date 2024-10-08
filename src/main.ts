import * as Constants from "./constants";
import { Point, M3x3 } from "./maths";

document.addEventListener('DOMContentLoaded', (event) => {
    if (!window.game) {
        window.game = new Game();
        window.game.resize(
            window.innerWidth,
            window.innerHeight,
            true // First resize not debounced.
        );
    } else {
        console.log('Game instance already started');
    }
});
window.addEventListener('resize', (event) => {
    if (window.game) {
        window.game.resize(
            window.innerWidth,
            window.innerHeight
        );
    }
});

function loop(timestamp: number): void {
    window.game.update(timestamp);
    requestAnimationFrame(loop);
}

type Renderable = {
    sprite: string;
    oldPosition: Point;
    position: Point;
    frame: Point;
    flip: boolean;
    blendmode: number;
    options: Record<string, any>;
};

type RenderableLayer = {
    blendmode: number;
    objs: Renderable[];
};

type RenderableLayers = {
    layers: RenderableLayer[];
};

export class Game {

    public started = false;
    public canvasElement: HTMLCanvasElement;
    public gl!: WebGL2RenderingContext;
    public ctx!: any;

    public finalBuffer: BackBuffer;
    public backBuffer: BackBuffer;
    public sprites: Record<string, Sprite>;
    public renderables!: RenderableLayers;

    public sprite1Pos: Point;
    public sprite1Frame: Point;

    public worldSpaceMatrix: M3x3;

    // Key press state
    public keysPressed: Record<string, any> = {};

    // Test Orientation
    public orientation = 0;
    public changeOrientationTimer: ReturnType<typeof setTimeout> | undefined;

    // FPS counter
    public lastTime = 0;
    public fps = 0;
    public fpsInterval = 1000; // Update FPS every 1 second
    public fpsLastTime = 0;

    public accumulator = 0; // What remained in deltaTime after last update 
    public timeSoFar = 0; // t in ms
    public timePerTick = 125; // dt in ms

    // Test frame experiments
    // public currentFrame = 0;
    // public frameTimer = 0;
    // public frameInterval = 80; // Time (ms) per frame
    // public frameCount = 249; // Number of frames in the sprite sheet

    private _resizeTimer: ReturnType<typeof setTimeout> | undefined;

    static BLENDMODE_ALPHA = 0;
    static BLENDMODE_ADDITIVE = 1;
    static BLENDMODE_MULTIPLY = 2;

    constructor() {
        console.log('Init WebGL2 Game !');

        this.canvasElement = document.createElement("canvas");
        this.canvasElement.width = Constants.SCREEN_WIDTH;
        this.canvasElement.height = Constants.SCREEN_HEIGHT;

        this.worldSpaceMatrix = new M3x3();

        this.gl = this.canvasElement.getContext('webgl2')!;
        this.gl.clearColor(0.4, 0.6, 1.0, 1.0);
        this.gl.enable(this.gl.BLEND);

        document.body.appendChild(this.canvasElement);

        // Create the start button
        const startButton = document.createElement("button");
        startButton.textContent = "Start Game";
        startButton.style.position = "absolute";
        startButton.style.top = "50%";
        startButton.style.left = "50%";
        startButton.style.transform = "translate(-50%, -50%)";
        startButton.style.padding = "10px 20px";
        startButton.style.fontSize = "18px";
        document.body.appendChild(startButton);
        startButton.addEventListener("click", () => {
            // Start the game only after button is clicked
            console.log('Starting the game!');
            // Hide and remove the button
            startButton.style.display = 'none';
            document.body.style.cursor = 'none';
            this.started = true;
            loop(0);
        });

        this.backBuffer = new BackBuffer(this.gl, { width: 512, height: 240 });
        this.finalBuffer = new BackBuffer(this.gl, { width: 512, height: 240 });

        this.sprites = {
            "alien": new Sprite(
                this.gl,
                "images/alien.png",
                Constants.vertexShaderSource,
                Constants.fragmentShaderSource,
                {
                    width: 64,
                    height: 64,
                }
            ),
            "halo": new Sprite(this.gl, "images/halo.png", Constants.vertexShaderSource,
                Constants.fragmentShaderSource, {
                width: 256,
                height: 256,
            }),
            "white": new Sprite(this.gl, "images/white.png", Constants.vertexShaderSource,
                Constants.fragmentShaderSource, {
                width: 1,
                height: 1,
            })

        };

        this.sprite1Pos = new Point();
        this.sprite1Frame = new Point();
        this.gatherRenderables();

    }

    debouncedChangeOrientation(clockwise: boolean) {
        // EXPERIMENTAL METHOD - WILL BE DELETED
        if (this.changeOrientationTimer) {
            clearTimeout(this.changeOrientationTimer);
        }
        this.changeOrientationTimer = setTimeout(() => {
            this.changeOrientation(clockwise);
        }, 60);
    }

    changeOrientation(clockwise: boolean) {
        // EXPERIMENTAL METHOD - WILL BE DELETED
        if (clockwise) {
            this.orientation = this.orientation + 1;
        } else {
            this.orientation = this.orientation - 1;
        }
        if (this.orientation > 15) {
            this.orientation = 0;
        } else if (this.orientation < 0) {
            this.orientation = 15;
        }
    }

    gatherRenderables(): void {
        this.renderables = {
            layers: [
                {
                    blendmode: Game.BLENDMODE_ALPHA,
                    objs: [
                        {
                            sprite: "alien",
                            position: { x: 32, y: 32 },
                            oldPosition: { x: 32, y: 32 },
                            frame: { x: 0, y: 0 },
                            flip: false,
                            blendmode: Game.BLENDMODE_ALPHA,
                            options: {}
                        },
                        {
                            sprite: "alien",
                            position: { x: 64, y: 64 },
                            oldPosition: { x: 64, y: 64 },
                            frame: { x: 0, y: 0 },
                            flip: false,
                            blendmode: Game.BLENDMODE_ALPHA,
                            options: {}
                        }
                    ]
                },
                {
                    blendmode: Game.BLENDMODE_MULTIPLY,
                    objs: [
                        {
                            sprite: "white",
                            position: { x: 0, y: 0 },
                            oldPosition: { x: 0, y: 0 },
                            frame: { x: 0, y: 0 },
                            flip: false,
                            blendmode: Game.BLENDMODE_ALPHA,
                            options: {
                                scalex: 512, scaley: 240,
                                u_color: [0.5, 0.125, 0.25, 1]
                            }
                        },
                        {
                            sprite: "halo",
                            position: { x: 128, y: 80 },
                            oldPosition: { x: 128, y: 80 },
                            frame: { x: 0, y: 0 },
                            flip: false,
                            blendmode: Game.BLENDMODE_ADDITIVE,
                            options: {}
                        }
                    ]
                },
            ]
        }
    }

    public resize(w: number, h: number, noDebounce?: boolean): void {
        if (noDebounce) {
            this.canvasElement.width = w;
            this.canvasElement.height = h;
            const wRatio = w / (h / Constants.GAME_HEIGHT);
            this.worldSpaceMatrix = new M3x3().translation(-1, 1).scale(2 / wRatio, -2 / Constants.GAME_HEIGHT);
        } else {
            // Debounced resize
            if (this._resizeTimer) {
                clearTimeout(this._resizeTimer);
            }
            this._resizeTimer = setTimeout(() => {
                this.canvasElement.width = w;
                this.canvasElement.height = h;
                const wRatio = w / (h / Constants.GAME_HEIGHT);
                this.worldSpaceMatrix = new M3x3().translation(-1, 1).scale(2 / wRatio, -2 / Constants.GAME_HEIGHT);
            }, 100);
        }
    }

    setBuffer(buffer?: BackBuffer): void {
        const gl = this.gl;
        if (buffer instanceof BackBuffer) {
            gl.viewport(0, 0, buffer.size.x, buffer.size.y);
            gl.bindFramebuffer(gl.FRAMEBUFFER, buffer.fbuffer);
        } else {
            gl.viewport(0, 0, this.canvasElement.width, this.canvasElement.height);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
    }

    setBlendMode(bm: number): void {
        switch (bm) {
            case Game.BLENDMODE_ALPHA:
                this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA); break;
            case Game.BLENDMODE_ADDITIVE:
                this.gl.blendFunc(this.gl.ONE, this.gl.ONE); break;
            case Game.BLENDMODE_MULTIPLY:
                this.gl.blendFunc(this.gl.DST_COLOR, this.gl.ZERO); break;
        }
    }

    checkKeys(): void {
        if (this.keysPressed['ArrowUp'] || this.keysPressed['w']) {
            // playerY -= playerSpeed * deltaTime;
            console.log("up");
        }
        if (this.keysPressed['ArrowDown'] || this.keysPressed['s']) {
            // playerY += playerSpeed * deltaTime;
            console.log("down");
        }
        if (this.keysPressed['ArrowLeft'] || this.keysPressed['a']) {
            // playerX -= playerSpeed * deltaTime;
            // debouncedChangeOrientation(false);
            console.log("left");

        }
        if (this.keysPressed['ArrowRight'] || this.keysPressed['d']) {
            // playerX += playerSpeed * deltaTime;
            // debouncedChangeOrientation(true);
            console.log("right");
        }
    }

    public update(timestamp: number): void {

        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.accumulator += deltaTime;

        while (this.accumulator >= this.timePerTick) {
            this.tick();
            this.accumulator -= this.timePerTick;
            this.timeSoFar += this.timePerTick;
        }
        const interpolationRatio = this.accumulator / this.timePerTick;

        this.render(interpolationRatio);

        // Calculate FPS
        if (timestamp - this.fpsLastTime > this.fpsInterval) {
            this.fps = Math.round(1000 / deltaTime);
            this.fpsLastTime = timestamp;
            // console.log('requestAnimationFrame FPS ', this.fps); // 30
        }
    }

    public tick(): void {
        // Advance game states in renderables:
        // from this.timeSoFar, by a this.timePerTick amount of time.

        // // Update game objects, handle input, etc.
        // this.frameTimer += deltaTime;
        // if (this.frameTimer > this.frameInterval) {
        //     this.frameTimer = 0;
        //     this.currentFrame = (this.currentFrame + 1) % this.frameCount;
        // }
        // this.checkKeys();

    }

    public interpolate(min: Point, max: Point, fract: number): Point {
        return new Point(max.x + (min.x - max.x) * fract, max.y + (min.y - max.y) * fract);
    }

    public render(interpolation: number): void {
        for (let l = 0; l < this.renderables.layers.length; l++) {
            const layer = this.renderables.layers[l];

            this.setBuffer(this.backBuffer);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);

            for (let i = 0; i < layer.objs.length; i++) {
                const obj = layer.objs[i];
                const sprite = this.sprites[obj.sprite];

                this.setBlendMode(obj.blendmode);
                sprite.render(this.interpolate(obj.oldPosition, obj.position, interpolation), obj.frame, obj.options);
            }

            this.setBlendMode(layer.blendmode);
            this.setBuffer(this.finalBuffer);
            this.backBuffer.render();

        }

        this.setBuffer();
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.setBlendMode(Game.BLENDMODE_ALPHA);
        this.finalBuffer.render();

        this.gl.flush();
    }

}

// type TParameters =
//     | { uniform: true; location: WebGLUniformLocation | null; type: number }
//     | { uniform: false; location: number; type: number };

type TParameters =
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

// type TParameters = {
//     uniform: boolean;
//     location: WebGLUniformLocation | number;
//     type: number;
// };

export class Material {

    public gl!: WebGL2RenderingContext;
    public program!: WebGLProgram;
    public parameters: Record<string, TParameters> = {};

    constructor(gl: WebGL2RenderingContext, vs: string, fs: string) {
        this.gl = gl;

        const vsShader = this.getShader(vs, gl.VERTEX_SHADER);
        const fsShader = this.getShader(fs, gl.FRAGMENT_SHADER);

        if (vsShader && fsShader) {
            this.program = gl.createProgram()!;
            gl.attachShader(this.program, vsShader);
            gl.attachShader(this.program, fsShader);
            gl.linkProgram(this.program);
            if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
                console.error("Cannot load shader \n" + gl.getProgramInfoLog(this.program));
            }

            this.gatherParameters();

            gl.detachShader(this.program, vsShader);
            gl.detachShader(this.program, fsShader);
            gl.deleteShader(vsShader);
            gl.deleteShader(fsShader);

            gl.useProgram(null);
        }
    }

    getShader(script: string, type: number): WebGLShader | null {
        const gl = this.gl;
        const output = gl.createShader(type);
        if (output) {
            gl.shaderSource(output, script);
            gl.compileShader(output);
            if (!gl.getShaderParameter(output, gl.COMPILE_STATUS)) {
                console.error("Shader Error: \n" + gl.getShaderInfoLog(output));
                return null;
            }
        }
        return output;
    }

    gatherParameters(): void {
        const gl = this.gl;
        let isUniform = 0;

        this.parameters = {};
        while (isUniform < 2) {
            let paramType = isUniform ? gl.ACTIVE_UNIFORMS : gl.ACTIVE_ATTRIBUTES;
            let count = gl.getProgramParameter(this.program, paramType);

            for (let i = 0; i < count; i++) {
                let details;
                let location;
                if (isUniform) {
                    details = gl.getActiveUniform(this.program, i);
                    location = gl.getUniformLocation(this.program, details!.name);
                    this.parameters[details!.name] = {
                        location: location as WebGLUniformLocation,
                        uniform: true,
                        type: details!.type
                    };
                } else {
                    details = gl.getActiveAttrib(this.program, i);
                    location = gl.getAttribLocation(this.program, details!.name);
                    this.parameters[details!.name] = {
                        location: location as number,
                        uniform: false,
                        type: details!.type
                    };
                }

            }
            isUniform++;
        }

    }

    setParam(w_name: string, a?: any, b?: any, c?: any, d?: any) {

        if (!(w_name in this.parameters)) {
            return;
        }

        const gl = this.gl;
        const param = this.parameters[w_name];

        if (param.uniform) {
            this.setUniform(param, a, b, c, d);
        } else {
            this.setAttribute(param, a, b, c, d);
        }

    }

    private setUniform(param: TParameters & { uniform: true }, a?: any, b?: any, c?: any, d?: any) {
        const gl = this.gl;

        switch (param.type) {
            case gl.FLOAT:
                gl.uniform1f(param.location, a);
                break;
            case gl.FLOAT_VEC2:
                gl.uniform2f(param.location, a, b);
                break;
            case gl.FLOAT_VEC3:
                gl.uniform3f(param.location, a, b, c);
                break;
            case gl.FLOAT_VEC4:
                gl.uniform4f(param.location, a, b, c, d);
                break;
            case gl.FLOAT_MAT3:
                gl.uniformMatrix3fv(param.location, false, a);
                break;
            case gl.FLOAT_MAT4:
                gl.uniformMatrix4fv(param.location, false, a);
                break;
            case gl.SAMPLER_2D:
                gl.uniform1i(param.location, a);
                break;
            default:
                console.warn(`Unsupported uniform type: ${param.type}`);
        }
    }

    private setAttribute(param: TParameters & { uniform: false }, a?: any, b?: any, c?: any, d?: any) {
        const gl = this.gl;

        gl.enableVertexAttribArray(param.location);
        const type = a ?? gl.FLOAT;
        const normalized = b ?? false;
        const stride = c ?? 0;
        const offset = d ?? 0;

        switch (param.type) {
            case gl.FLOAT:
                gl.vertexAttribPointer(param.location, 1, type, normalized, stride, offset);
                break;
            case gl.FLOAT_VEC2:
                gl.vertexAttribPointer(param.location, 2, type, normalized, stride, offset);
                break;
            case gl.FLOAT_VEC3:
                gl.vertexAttribPointer(param.location, 3, type, normalized, stride, offset);
                break;
            case gl.FLOAT_VEC4:
                gl.vertexAttribPointer(param.location, 4, type, normalized, stride, offset);
                break;
            default:
                console.warn(`Unsupported attribute type: ${param.type}`);
        }
    }

}

export class Sprite {

    public isLoaded = false;
    public material: Material;
    public image: HTMLImageElement;
    public gl!: WebGL2RenderingContext;
    public gl_tex!: WebGLTexture;
    public geo_buff!: WebGLBuffer;
    public tex_buff!: WebGLBuffer;
    public size: Point;
    public uv_x = 0;
    public uv_y = 0;

    public aPositionLoc!: GLint;
    public aTexCoordLoc!: GLint;
    public uImageLoc!: WebGLUniformLocation;
    public uWorldLoc!: WebGLUniformLocation;
    public uObjectLoc!: WebGLUniformLocation;
    public uFrameLoc!: WebGLUniformLocation;

    constructor(
        gl: WebGL2RenderingContext,
        imgURL: string,
        vs: string,
        fs: string,
        options: {
            height?: number;
            width?: number;
        } = {}
    ) {
        this.gl = gl;
        this.isLoaded = false;
        this.material = new Material(gl, vs, fs);

        this.size = new Point(64, 64);
        if (typeof options.width === 'number') {
            this.size.x = options.width * 1;
        }
        if (typeof options.height === 'number') {
            this.size.y = options.height * 1;
        }

        this.image = new Image();
        this.image.src = imgURL;
        this.image.onload = () => {
            this.setup();
        }
    }

    static createRectArray(x = 0, y = 0, w = 1, h = 1) {
        return new Float32Array([
            x, y,
            x + w, y,
            x, y + h,
            x, y + h,
            x + w, y,
            x + w, y + h,
        ]);
    }

    setup() {

        const gl = this.gl;

        gl.useProgram(this.material.program);
        this.gl_tex = gl.createTexture()!;

        gl.bindTexture(gl.TEXTURE_2D, this.gl_tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
        gl.bindTexture(gl.TEXTURE_2D, null);

        this.uv_x = this.size.x / this.image.width;
        this.uv_y = this.size.y / this.image.height;

        this.tex_buff = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tex_buff);
        gl.bufferData(gl.ARRAY_BUFFER, Sprite.createRectArray(0, 0, this.uv_x, this.uv_y), gl.STATIC_DRAW);

        this.geo_buff = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.geo_buff);
        gl.bufferData(gl.ARRAY_BUFFER, Sprite.createRectArray(0, 0, this.size.x, this.size.y), gl.STATIC_DRAW);

        gl.useProgram(null);
        this.isLoaded = true;

    }

    render(position: Point, frames: Point, options?: Record<string, any>) {
        if (this.isLoaded) {
            const gl = this.gl;

            const frame_x = Math.floor(frames.x) * this.uv_x;
            const frame_y = Math.floor(frames.y) * this.uv_y;

            let oMat = new M3x3().translation(position.x, position.y);

            gl.useProgram(this.material.program);

            this.material.setParam("u_color", 1, 1, 1, 1);

            for (const option in options) {
                const optionValue = options[option];
                this.material.setParam(option, ...optionValue);

                if (option == "scalex") {
                    oMat = oMat.scale(options.scalex, 1.0);
                }
                if (option == "scaley") {
                    oMat = oMat.scale(1.0, options.scaley);
                }
            }

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.gl_tex);
            this.material.setParam("u_image", 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.tex_buff);
            this.material.setParam("a_texCoord");

            gl.bindBuffer(gl.ARRAY_BUFFER, this.geo_buff);
            this.material.setParam("a_position");

            this.material.setParam("u_frame", frame_x, frame_y);
            this.material.setParam("u_world", window.game.worldSpaceMatrix.getFloatArray());
            this.material.setParam("u_object", oMat.getFloatArray());

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 6);

            gl.useProgram(null);

        }
    }

}

export class BackBuffer {

    public gl!: WebGL2RenderingContext;
    public material: Material;
    public size: Point;
    public fbuffer: WebGLFramebuffer;
    public rbuffer: WebGLRenderbuffer;
    public texture: WebGLTexture;
    public tex_buff: WebGLBuffer;
    public geo_buff: WebGLBuffer;

    static VS = /*glsl*/ `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;

    varying vec2 v_texCoord;
    void main() {
        gl_Position = vec4(a_position, 1, 1);
        v_texCoord = a_texCoord;
    }
    `;
    static FS = /*glsl*/ `
    precision mediump float;
    uniform sampler2D u_image;
    varying vec2 v_texCoord;

    void main(){
        gl_FragColor = texture2D(u_image, v_texCoord);
    }
    `;

    constructor(
        gl: WebGL2RenderingContext,

        options: {
            height?: number;
            width?: number;
        } = {}

    ) {
        this.gl = gl;
        this.material = new Material(this.gl, BackBuffer.VS, BackBuffer.FS);
        this.size = new Point(512, 512);
        if (typeof options.width === 'number') {
            this.size.x = options.width * 1;
        }
        if (typeof options.height === 'number') {
            this.size.y = options.height * 1;
        }

        this.fbuffer = gl.createFramebuffer()!;
        this.rbuffer = gl.createRenderbuffer()!;
        this.texture = gl.createTexture()!;

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbuffer);
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.rbuffer);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.size.x, this.size.y, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.size.x, this.size.y);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.rbuffer);

        // Create geometry for rendering
        this.tex_buff = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tex_buff);
        gl.bufferData(gl.ARRAY_BUFFER, Sprite.createRectArray(), gl.STATIC_DRAW);

        this.geo_buff = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.geo_buff);
        gl.bufferData(gl.ARRAY_BUFFER, Sprite.createRectArray(-1, -1, 2, 2), gl.STATIC_DRAW);

        gl.bindTexture(gl.TEXTURE_2D, null);
        // gl.bindTexture(gl.RENDERBUFFER, null); // ! GIVES WARNING
        // gl.bindTexture(gl.FRAMEBUFFER, null); // ! GIVES WARNING
    }

    render() {
        const gl = this.gl;

        gl.useProgram(this.material.program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        this.material.setParam("u_image", 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.tex_buff);
        this.material.setParam("a_texCoord");

        gl.bindBuffer(gl.ARRAY_BUFFER, this.geo_buff);
        this.material.setParam("a_position");

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 6);

        gl.useProgram(null);

    }

}

type TCommand = {
    order: number;
    x: number;
    y: number;
    entityId: number;
}

type TEntity = {
    id: number;
    // states
    type: number;
    hitPoints: number;
    state: number;
    // Ten queuable commands
    orderQty: number;
    orderIndex: number;
    orderPool: [
        TCommand, TCommand, TCommand, TCommand, TCommand,
        TCommand, TCommand, TCommand, TCommand, TCommand
    ];
    // renderable display properties
    orientation: number;
    frameIndex: number;
    active: boolean;
}

/**
 * Singleton Entities Object Pool
 */
export class Entities {

    private pool: Array<TEntity> = [];
    private lastId = 0;

    constructor(initialPoolSize: number) {

        for (let i = 0; i < initialPoolSize; i++) {
            this.pool.push({
                id: 0,
                type: 0,
                hitPoints: 0,
                state: 0,
                orderQty: 0,
                orderIndex: 0,
                orderPool: [
                    { order: 0, x: 0, y: 0, entityId: 0 }, { order: 0, x: 0, y: 0, entityId: 0 },
                    { order: 0, x: 0, y: 0, entityId: 0 }, { order: 0, x: 0, y: 0, entityId: 0 },
                    { order: 0, x: 0, y: 0, entityId: 0 }, { order: 0, x: 0, y: 0, entityId: 0 },
                    { order: 0, x: 0, y: 0, entityId: 0 }, { order: 0, x: 0, y: 0, entityId: 0 },
                    { order: 0, x: 0, y: 0, entityId: 0 }, { order: 0, x: 0, y: 0, entityId: 0 },
                ],
                orientation: 0,
                frameIndex: 0,
                active: false,
            });
        }

    }

    public spawn(): TEntity | undefined {
        const entity = this.pool.find(e => !e.active);
        if (entity) {
            entity.active = true;
            entity.id = ++this.lastId;
            return entity;
        }
    }

    public remove(entity: TEntity): void {
        entity.active = false;
    }


}
