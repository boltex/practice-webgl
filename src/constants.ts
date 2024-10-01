export const SCREEN_WIDTH = 800;
export const SCREEN_HEIGHT = 600;
export const SPRITE_SIZE = 32;

export const vertexShaderSource = /*glsl*/ `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;

    varying vec2 v_texCoord;

    void main() {
        gl_Position = vec4(a_position, 1, 1);
        v_texCoord = a_texCoord;
    }
`;

export const fragmentShaderSource = /*glsl*/ `
    precision mediump float;
    uniform sampler2D u_texture;
    
    varying vec2 v_texCoord;

    void main(){
        gl_FragColor = texture2D(u_texture, v_texCoord);
    }
`;
