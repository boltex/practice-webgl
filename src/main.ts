document.addEventListener('DOMContentLoaded', (event) => {

    console.log('Init WebGL2 Game');

    const canvas = document.querySelector('canvas');
    if (!canvas) {
        return;
    }
    const gl = canvas.getContext('webgl2');
    if (!gl) {
        return;
    }
    const program = gl.createProgram();

    console.log('Got webgl2 context');
    // Create program
    // gl.useProgram(program);

});
