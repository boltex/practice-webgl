import * as Constants from "./constants";
import { Point, M3x3 } from "./maths";

document.addEventListener('DOMContentLoaded', (event) => {
    if (!window.game) {
        window.game = new Game();
        window.game.resize(
            window.innerWidth,
            window.innerHeight
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
    public sprite: Sprite;
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

        this.sprite = new Sprite(this.gl, "images/sprite.png", Constants.vertexShaderSource, Constants.fragmentShaderSource);
    }

    public update(): void {
        // this.gl.viewport(0, 0, Constants.SCREEN_WIDTH, Constants.SCREEN_HEIGHT);
        this.gl.viewport(0, 0, this.canvasElement.width, this.canvasElement.height);

        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.sprite.render();

        this.gl.flush();

    }

    public resize(w: number, h: number): void {
        if (this._resizeTimer) {
            clearTimeout(this._resizeTimer);
        }
        this._resizeTimer = setTimeout(() => {
            this.canvasElement.width = w;
            this.canvasElement.height = h;

            const wRatio = w / (h / 240);
            this.worldSpaceMatrix = new M3x3().translation(-1, 1).scale(2 / wRatio, -2 / 240);
            // this.worldSpaceMatrix = new M3x3().translation(-1.0, 1.0).scale(2 / wRatio, -2 / 240);
            console.log('RESIZE', w, h);
            // 
        }, 100);
    }


}

export class Material {

    public gl!: WebGL2RenderingContext;
    public program!: WebGLProgram;

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

            gl.detachShader(this.program, vsShader);
            gl.detachShader(this.program, fsShader);
            gl.deleteShader(vsShader);
            gl.deleteShader(fsShader);
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

    public aPositionLoc!: GLint;
    public aTexCoordLoc!: GLint;
    public uImageLoc!: WebGLUniformLocation;
    public uWorldLoc!: WebGLUniformLocation;

    constructor(gl: WebGL2RenderingContext, imgURL: string, vs: string, fs: string, options: Record<string, any> = {}) {

        this.gl = gl;
        this.isLoaded = false;
        this.material = new Material(gl, vs, fs);

        this.size = new Point(64, 64);
        if ("width" in options) {
            this.size.x = options["width"] * 1;
        }
        if ("height" in options) {
            this.size.y = options["height"] * 1;
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

        this.tex_buff = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tex_buff);
        gl.bufferData(gl.ARRAY_BUFFER, Sprite.createRectArray(), gl.STATIC_DRAW);

        this.geo_buff = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.geo_buff);
        gl.bufferData(gl.ARRAY_BUFFER, Sprite.createRectArray(0, 0, this.size.x, this.size.y), gl.STATIC_DRAW);

        this.aPositionLoc = gl.getAttribLocation(this.material.program, "a_position");
        this.aTexCoordLoc = gl.getAttribLocation(this.material.program, "a_texCoord");
        this.uImageLoc = gl.getUniformLocation(this.material.program, "u_texture")!;

        this.uWorldLoc = gl.getUniformLocation(this.material.program, "u_world")!;

        gl.useProgram(null);
        this.isLoaded = true;

    }

    render() {
        if (this.isLoaded) {
            const gl = this.gl;
            gl.useProgram(this.material.program);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.gl_tex);
            gl.uniform1i(this.uImageLoc, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.tex_buff);
            gl.enableVertexAttribArray(this.aTexCoordLoc);
            gl.vertexAttribPointer(this.aTexCoordLoc, 2, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.geo_buff);
            gl.enableVertexAttribArray(this.aPositionLoc);
            gl.vertexAttribPointer(this.aPositionLoc, 2, gl.FLOAT, false, 0, 0);

            gl.uniformMatrix3fv(this.uWorldLoc, false, window.game.worldSpaceMatrix.getFloatArray());

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 6);

            gl.useProgram(null);

        }
    }


}

