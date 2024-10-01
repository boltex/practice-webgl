import * as Constants from "./constants";

document.addEventListener('DOMContentLoaded', (event) => {
    if (!window.game) {
        window.game = new Game();
        loop();
    } else {
        console.log('Game instance already started');
    }
});

function loop(): void {
    window.game.update();
    requestAnimationFrame(loop);
}

export class Game {

    public canvasElement: HTMLCanvasElement;
    public gl!: WebGL2RenderingContext;

    constructor() {
        console.log('Init WebGL2 Game !');

        this.canvasElement = document.createElement("canvas");
        this.canvasElement.width = Constants.SCREEN_WIDTH;
        this.canvasElement.height = Constants.SCREEN_HEIGHT;

        const testgl = this.canvasElement.getContext('webgl2');

        if (!testgl) {
            console.error('No webgl2 context');
            return;
        } else {
            this.gl = testgl;
        }

        document.body.appendChild(this.canvasElement);

        const mat = new Material(this.gl, Constants.vertexShaderSource, Constants.fragmentShaderSource);
    }

    public update(): void {
        this.gl.viewport(0, 0, Constants.SCREEN_WIDTH, Constants.SCREEN_HEIGHT);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.gl.flush();

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


}
