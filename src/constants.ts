export const SCREEN_WIDTH = 800;
export const SCREEN_HEIGHT = 600;
export const SPRITE_SIZE = 32;
export const GAME_HEIGHT = 240;

export const vertexShaderSource = /*glsl*/ `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;

    uniform mat3 u_world;
    uniform mat3 u_object;
    uniform vec2 u_frame;

    varying vec2 v_texCoord;
    void main() {
        gl_Position = vec4(u_world * u_object * vec3(a_position, 1), 1);
        v_texCoord = a_texCoord + u_frame;
    }
`;

export const fragmentShaderSource = /*glsl*/ `
    precision mediump float;
    uniform sampler2D u_image;
    uniform vec4 u_color;
    varying vec2 v_texCoord;

    void main(){
        gl_FragColor = u_color * texture2D(u_image, v_texCoord);
    }
`;

