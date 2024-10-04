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
        loop();
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

function loop(): void {
    window.game.update();
    requestAnimationFrame(loop);
}

export class Game {

    public canvasElement: HTMLCanvasElement;
    public gl!: WebGL2RenderingContext;
    public lightBuffer: BackBuffer;
    public backBuffer: BackBuffer;
    public halo: Sprite;
    public white: Sprite;
    public sprite1: Sprite;
    public sprite1Pos: Point;
    public sprite1Frame: Point;

    // public sprite2: Sprite;
    public sprite2Pos: Point;
    public sprite2Frame: Point;

    public worldSpaceMatrix: M3x3;

    private _resizeTimer: ReturnType<typeof setTimeout> | undefined;

    constructor() {
        console.log('Init WebGL2 Game !');

        this.canvasElement = document.createElement("canvas");
        this.canvasElement.width = Constants.SCREEN_WIDTH;
        this.canvasElement.height = Constants.SCREEN_HEIGHT;

        this.worldSpaceMatrix = new M3x3();

        this.gl = this.canvasElement.getContext('webgl2')!;
        this.gl.clearColor(0.4, 0.6, 1.0, 0.0);

        document.body.appendChild(this.canvasElement);

        this.backBuffer = new BackBuffer(this.gl, { width: 512, height: 240 });
        this.lightBuffer = new BackBuffer(this.gl, { width: 512, height: 240 });

        this.halo = new Sprite(this.gl, "images/halo.png", Constants.vertexShaderSource,
            Constants.fragmentShaderSource, {
            width: 256,
            height: 256,
        });
        this.white = new Sprite(this.gl, "images/white.png", Constants.vertexShaderSource,
            Constants.fragmentShaderSource, {
            width: 1,
            height: 1,
        });

        this.sprite1 = new Sprite(
            this.gl,
            "images/alien.png",
            Constants.vertexShaderSource,
            Constants.fragmentShaderSource,
            {
                width: 64,
                height: 64,
            }
        );
        this.sprite1Pos = new Point();
        this.sprite1Frame = new Point();

        this.sprite2Pos = new Point();
        this.sprite2Frame = new Point();

        // this.sprite2 = new Sprite(this.gl, "images/sprite.png", Constants.vertexShaderSource, Constants.fragmentShaderSource);
    }

    public update(): void {
        this.gl.viewport(0, 0, this.canvasElement.width, this.canvasElement.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.sprite1Frame.x = (new Date().getTime() * 0.006) % 3;
        this.sprite1Frame.y = (new Date().getTime() * 0.002) % 2;
        this.sprite1Pos.x = (this.sprite1Pos.x + 1.1) % 256;

        this.sprite2Frame.x = (new Date().getTime() * 0.006) % 3;
        this.sprite2Frame.y = (new Date().getTime() * 0.002) % 2;

        this.setBuffer(this.backBuffer);
        this.sprite1.render(this.sprite1Pos, this.sprite1Frame);
        this.sprite1.render(this.sprite2Pos, this.sprite2Frame);


        this.setBuffer(this.lightBuffer);
        this.white.render(new Point(), new Point(), { scalex: 512, scaley: 240, u_color: [0.125, 0.125, 0.25, 1] });

        this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
        // this.halo.render(this.sprite1Pos, new Point());
        this.halo.render(new Point(32, -64), new Point());

        this.setBuffer();
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.backBuffer.render();
        // this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
        this.gl.blendFunc(this.gl.DST_COLOR, this.gl.ZERO);
        this.lightBuffer.render();

        this.gl.flush();

    }

    setBuffer(buffer?: BackBuffer): void {
        const gl = this.gl;
        if (buffer instanceof BackBuffer) {
            gl.viewport(0, 0, buffer.size.x, buffer.size.y);
            gl.bindFramebuffer(gl.FRAMEBUFFER, buffer.fbuffer);
            gl.clear(gl.COLOR_BUFFER_BIT);
        } else {
            gl.viewport(0, 0, this.canvasElement.width, this.canvasElement.height);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
    }

    public resize(w: number, h: number, noDebounce?: boolean): void {
        if (noDebounce) {
            this.canvasElement.width = w;
            this.canvasElement.height = h;
            const wRatio = w / (h / Constants.GAME_HEIGHT);
            this.worldSpaceMatrix = new M3x3().translation(-1, 1).scale(2 / wRatio, -2 / Constants.GAME_HEIGHT);
            return
        }
        // ELSE : debounded resize
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

type TParameters =
    | { uniform: true; location: WebGLUniformLocation | null; type: number }
    | { uniform: false; location: number; type: number };

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
                } else {
                    details = gl.getActiveAttrib(this.program, i);
                    location = gl.getAttribLocation(this.program, details!.name);
                }

                // @ts-expect-error
                this.parameters[details!.name] = {
                    location: location,
                    uniform: !!isUniform,
                    type: details!.type
                }
            }
            isUniform++;
        }

    }

    setParam(w_name: string, a?: any, b?: any, c?: any, d?: any, e?: any) {
        const gl = this.gl;

        if (w_name in this.parameters) {
            const param = this.parameters[w_name];
            if (param.uniform) {
                switch (param.type) {
                    case gl.FLOAT: gl.uniform1f(param.location, a); break;
                    case gl.FLOAT_VEC2: gl.uniform2f(param.location, a, b); break;
                    case gl.FLOAT_VEC3: gl.uniform3f(param.location, a, b, c); break;
                    case gl.FLOAT_VEC4: gl.uniform4f(param.location, a, b, c, d); break;
                    case gl.FLOAT_MAT3: gl.uniformMatrix3fv(param.location, false, a); break;
                    case gl.FLOAT_MAT4: gl.uniformMatrix4fv(param.location, false, a); break;
                    case gl.SAMPLER_2D: gl.uniform1i(param.location, a); break;
                }
            } else {
                gl.enableVertexAttribArray(param.location);
                if (a == undefined) {
                    a = gl.FLOAT;
                }
                if (b == undefined) {
                    b = false;
                }
                if (c == undefined) {
                    c = 0;
                }
                if (d == undefined) {
                    d = 0;
                }

                switch (param.type) {
                    case gl.FLOAT: gl.vertexAttribPointer(param.location, 1, a, b, c, d); break;
                    case gl.FLOAT_VEC2: gl.vertexAttribPointer(param.location, 2, a, b, c, d); break;
                    case gl.FLOAT_VEC3: gl.vertexAttribPointer(param.location, 3, a, b, c, d); break;
                    case gl.FLOAT_VEC4: gl.vertexAttribPointer(param.location, 4, a, b, c, d); break;
                }
            }
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
                // @ts-expect-error
                this.material.setParam.apply(this.material, [option].concat(options[option]))

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
        gl.bindTexture(gl.RENDERBUFFER, null);
        gl.bindTexture(gl.FRAMEBUFFER, null);


    }
    render() {
        const gl = this.gl;
        //
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

