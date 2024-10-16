import * as Constants from "./constants";
import { Point, M3x3 } from "./maths";
import { Renderable, RenderableLayers, TEntity, TParameters } from "./type";

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

export class Game {

    public started = false;
    public canvasRect: DOMRect;
    public optionsVisible = false;
    public optionsAspectRatio = 0; // 0 = 4:3, 1 = 16:9
    public aspectRatio = 4 / 3;
    // 4:3 = 960 x 720 
    // 16:9 = 1280 x 720

    public canvasElement: HTMLCanvasElement;
    public gl!: WebGL2RenderingContext;

    public finalBuffer16x9: BackBuffer;
    public finalBuffer4x3: BackBuffer;
    public backBuffer16x9: BackBuffer;
    public backBuffer4x3: BackBuffer;
    public finalBuffer: BackBuffer;
    public backBuffer: BackBuffer;
    public sprites: Record<string, Sprite>;
    public renderables!: RenderableLayers;

    public worldSpaceMatrix: M3x3;

    // Game States
    public entities!: Entities;

    // A.I.
    public ai!: AI;

    // Key press state
    public keysPressed: Record<string, any> = {};

    // Game Map
    public gamemap: number[] = [];

    // Screen States
    public screenx = 960; // or 1280
    public screeny = 720;

    public selecting: boolean = false;
    public selx = 0; // Started selection at specific coords
    public sely = 0;

    public scrollx = 0; // Current scroll position 
    public scrolly = 0;

    public SCROLLSPEED = 2; // 50;   // speed in pixels for scrolling
    public SCROLLBORDER = 25; // 5;   // pixels from screen to trigger scrolling
    public xscr_e = this.screenx - this.SCROLLBORDER; // constants for finding trigger zone
    public yscr_e = this.screeny - this.SCROLLBORDER;

    public tilebmpsize = 1024;  // size of a bitmap of tiles
    public tilesize = 128;      // size of an individual square TILE 
    public tileratio = this.tilebmpsize / this.tilesize;
    public initrangex = (this.screenx / this.tilesize) + 1;
    public initrangey = (this.screeny / this.tilesize) + 1;

    public gamemapw = 9; // game map width in TILES 
    public gamemaph = 9;
    public maxmapx = (this.gamemapw * this.tilesize) - 1;
    public maxmapy = (this.gamemaph * this.tilesize) - 1;
    public maxscrollx = 1 + this.maxmapx - this.screenx;
    public maxscrolly = 1 + this.maxmapy - this.screeny;

    public scrollnowx = 0; // Scroll amount to be applied to scroll when processing
    public scrollnowy = 0;

    public curx = 0 // Current mouse position
    public cury = 0

    public gamestate = 0   // 0=SPLASH
    // 1=Lobby (main menu)
    // 2=game Lobby
    // 3=play Loop
    // 4=Game over/stats
    // 5=EDITION ANIMS
    // 6=EDITION MAP
    // 7=OPTIONS

    public gameaction = 0    // 0=none
    public DEFAULTACTION = 1 // game actions CONSTANTS, zero means none
    public RELEASESEL = 2

    public gamecurx = 0
    public gamecury = 0
    public gameselx = 0
    public gamesely = 0

    // Test Cursor vatiables
    public curanim = 0
    public curanimtotal = 6
    public curanimx = 0
    public curanimy = 0

    // Test Orientation vatiable
    public testSpriteOrientation = 0;

    // FPS counter
    public lastTime = 0;
    public fps = 0;
    public fpsInterval = 1000; // Update FPS every 1 second
    public fpsLastTime = 0;

    // TICK AT 8 FPS
    public tickAccumulator = 0; // What remained in deltaTime after last update 
    public currentTick = 0;
    public timePerTick = 125; // dt in ms (125 is 8 per second)
    public timerTriggerAccum = this.timePerTick * 3; // 3 times the timePerTick

    // ANIMATIONS AT 15 FPS
    public animAccumulator = 0; // What remained in deltaTime after last update 
    public currentAnim = 0;
    public timePerAnim = 67; // dt in ms (66.66 is 15 per second)

    private _resizeTimer: ReturnType<typeof setTimeout> | undefined;

    static BLENDMODE_ALPHA = 0;
    static BLENDMODE_ADDITIVE = 1;
    static BLENDMODE_MULTIPLY = 2;

    constructor() {
        console.log('Init WebGL2 Game !');
        console.log('initrangex', this.initrangex);
        console.log('initrangey', this.initrangey);
        console.log('tileratio', this.tileratio);

        this.canvasElement = document.createElement("canvas");
        this.canvasElement.width = this.screenx;
        this.canvasElement.height = this.screeny;
        this.canvasRect = this.canvasElement.getBoundingClientRect();

        this.worldSpaceMatrix = new M3x3();

        this.gl = this.canvasElement.getContext('webgl2', {
            antialias: false,
            alpha: false,
            depth: false,
        })!;
        this.gl.enable(this.gl.BLEND);

        document.body.appendChild(this.canvasElement);

        // Prevent right-click context menu
        this.canvasElement.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });

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
            console.log('Starting the game!');

            document.addEventListener('keydown', (e) => {
                this.keysPressed[e.key] = true;
            });
            document.addEventListener('keyup', (e) => {
                this.keysPressed[e.key] = false;
            });
            this.canvasElement.addEventListener("mousemove", (event) => {
                this.mouseMove(event);
            });
            this.canvasElement.addEventListener("mousedown", (event) => {
                this.mouseDown(event);
            });
            this.canvasElement.addEventListener("mouseup", (event) => {
                this.mouseUp(event);
            });

            startButton.style.display = 'none';
            document.body.style.cursor = 'none'; // ! HIDE NATIVE CURSOR !
            this.started = true;
            // Setup timer in case RAF Skipped when not in foreground or minimized.
            setInterval(() => { this.checkUpdate(); }, 500);
            loop(0);
        });

        this.backBuffer16x9 = new BackBuffer(this.gl, { width: 1280, height: 720 });
        this.backBuffer4x3 = new BackBuffer(this.gl, { width: 960, height: 720 });
        this.finalBuffer16x9 = new BackBuffer(this.gl, { width: 1280, height: 720 });
        this.finalBuffer4x3 = new BackBuffer(this.gl, { width: 960, height: 720 });

        if (this.optionsAspectRatio === 0) {
            // 4:3
            this.backBuffer = this.backBuffer4x3
            this.finalBuffer = this.finalBuffer4x3;
        } else {
            // 16:9
            this.backBuffer = this.backBuffer16x9
            this.finalBuffer = this.finalBuffer16x9
        }

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
            "background": new Sprite(
                this.gl,
                "images/plancher2.png",
                Constants.vertexShaderSource,
                Constants.fragmentShaderSource,
                {
                    width: this.tilesize,
                    height: this.tilesize,
                }
            ),
            "white": new Sprite(
                this.gl,
                "images/white.png",
                Constants.vertexShaderSource,
                Constants.fragmentShaderSource,
                {
                    width: 1,
                    height: 1,
                }
            ),
            // TEST LIGHTING EXPERIMENT FROM https://github.com/jamesrehabstudio
            "halo": new Sprite(
                this.gl,
                "images/halo.png",
                Constants.vertexShaderSource,
                Constants.fragmentShaderSource,
                {
                    width: 256,
                    height: 256,
                }
            ),

        };

        this.initGameStates();

    }

    initGameStates(): void {
        // Fill entities
        this.entities = new Entities(100);
        this.ai = new AI(this);

        // Create 3 test Aliens
        const alien1 = this.entities.spawn();
        alien1.type = 1;
        alien1.hitPoints = 100;
        alien1.x = 515;
        alien1.y = 100;
        const alien2 = this.entities.spawn();
        alien2.type = 1;
        alien2.hitPoints = 100;
        alien2.x = 0;
        alien2.y = 0;
        const alien3 = this.entities.spawn();
        alien3.type = 1;
        alien3.hitPoints = 100;
        alien3.x = 64;
        alien3.y = 64;

        // Build Map 
        // TEST temp map 9 by 9 tiles 
        for (let temp1 = 0; temp1 < 8; temp1++) { // start with 8 ROW 
            this.gamemap.push(temp1 * 8); // added row total 1 width COLUMN
            for (let temp2 = 0; temp2 < 8; temp2++) {  // + 8 COLUMN
                this.gamemap.push(temp2 + temp1 * 8); // here total 9 width COLUMN
            }
        }

        // Proof CHANGE THOSE GAMEMAPS TO PROVE THEY ARE TILES
        this.gamemap[21] = 3;
        for (let temp = 0; temp < 9; temp++) { // add last row of 9 ROW
            this.gamemap.push(temp + 56);
        }
    }

    changeOrientation(clockwise: boolean) {
        // EXPERIMENTAL METHOD - WILL BE DELETED
        if (clockwise) {
            this.testSpriteOrientation = this.testSpriteOrientation + 1;
        } else {
            this.testSpriteOrientation = this.testSpriteOrientation - 1;
        }
        if (this.testSpriteOrientation > 15) {
            this.testSpriteOrientation = 0;
        } else if (this.testSpriteOrientation < 0) {
            this.testSpriteOrientation = 15;
        }
    }

    // Function to get the x-coordinate of a sprite
    public getSpriteX(index: number, orientation: number): number {
        const orientationX = (orientation % 4) * 16;
        const spriteX = (index % 16);
        return orientationX + spriteX;
    }

    // Function to get the y-coordinate of a sprite
    public getSpriteY(index: number, orientation: number): number {
        const orientationY = Math.floor(orientation / 4) * 16;
        const spriteY = Math.floor(index / 16);
        return orientationY + spriteY;
    }

    gatherRenderables(): void {

        let processed = 0;
        let entity;

        const aliens: Renderable[] = [];
        for (let i = 0; processed < this.entities.active || i < this.entities.total; i++) {
            entity = this.entities.pool[i];
            if (entity.active) {
                processed += 1;
                aliens.push(
                    {
                        sprite: "alien",
                        position: { x: entity.x, y: entity.y },
                        oldPosition: { x: entity.x, y: entity.y },
                        frame: {
                            x: this.getSpriteX(entity.frameIndex, entity.orientation),
                            y: this.getSpriteY(entity.frameIndex, entity.orientation)
                        },
                        flip: false,
                        blendmode: Game.BLENDMODE_ALPHA,
                        options: {}
                    }
                );
            }
        }

        const cursor: Renderable[] = [];
        cursor.push(
            {
                sprite: "alien",
                position: { x: this.curx - 32, y: this.cury - 32 },
                oldPosition: { x: this.curx - 32, y: this.cury - 32 },
                frame: { x: this.selecting ? 26 : 29, y: 15 },
                flip: false,
                blendmode: Game.BLENDMODE_ALPHA,
                options: {}
            }
        );

        // TODO : ANIMATED ACTION CURSOR
        // if curanim>0: # --------------- animated cursor ... MAY CHANGE 
        // alientexar[0].enable() 
        // sq64in1024( curanim+249 , curanimx-scrollx , curanimy-scrolly)
        // alientexar[0].disable()
        if (this.curanim > 0) {
            cursor.push(
                {
                    sprite: "alien", // top horizontal
                    position: { x: this.curanimx - this.scrollx, y: this.curanimy - this.scrolly },
                    oldPosition: { x: this.curanimx - this.scrollx, y: this.curanimy - this.scrolly },
                    frame: { x: 9 + this.curanim, y: 15 },
                    flip: false,
                    blendmode: Game.BLENDMODE_ALPHA,
                    options: {}
                }
            );
        }

        if (this.selecting) {
            // Draw selection rectangle with lines
            const cx1 = Math.min(this.selx, this.curx);
            const cx2 = Math.max(this.selx, this.curx);
            const cy1 = Math.min(this.sely, this.cury);
            const cy2 = Math.max(this.sely, this.cury);

            cursor.push(
                {
                    sprite: "white", // top horizontal
                    position: { x: cx1, y: cy1 },
                    oldPosition: { x: cx1, y: cy1 },
                    frame: { x: 0, y: 0 },
                    flip: false,
                    blendmode: Game.BLENDMODE_ALPHA,
                    options: {
                        scalex: cx2 - cx1, scaley: 2,
                        u_color: [0.0, 1.0, 0.0, 1]
                    }
                }
            );
            cursor.push(
                {
                    sprite: "white", // bottom horizontal
                    position: { x: cx1, y: cy2 },
                    oldPosition: { x: cx1, y: cy2 },
                    frame: { x: 0, y: 0 },
                    flip: false,
                    blendmode: Game.BLENDMODE_ALPHA,
                    options: {
                        scalex: cx2 - cx1, scaley: 2,
                        u_color: [0.0, 1.0, 0.0, 1]
                    }
                }
            );
            cursor.push(
                {
                    sprite: "white", // left vertical
                    position: { x: cx1, y: cy1 },
                    oldPosition: { x: cx1, y: cy1 },
                    frame: { x: 0, y: 0 },
                    flip: false,
                    blendmode: Game.BLENDMODE_ALPHA,
                    options: {
                        scalex: 2, scaley: cy2 - cy1,
                        u_color: [0.0, 1.0, 0.0, 1]
                    }
                }
            );
            cursor.push(
                {
                    sprite: "white", // right vertical
                    position: { x: cx2, y: cy1 },
                    oldPosition: { x: cx2, y: cy1 },
                    frame: { x: 0, y: 0 },
                    flip: false,
                    blendmode: Game.BLENDMODE_ALPHA,
                    options: {
                        scalex: 2, scaley: cy2 - cy1,
                        u_color: [0.0, 1.0, 0.0, 1]
                    }
                }
            );
        }

        const backgroundTiles: Renderable[] = [];

        const tileoffx = Math.floor(this.scrollx / this.tilesize);
        const tileoffy = Math.floor(this.scrolly / this.tilesize);
        let rangex = this.initrangex
        let rangey = this.initrangey
        if (this.scrollx % this.tilesize > this.tilesize - (this.screenx % this.tilesize)) {
            rangex += 1;
        }
        if (this.scrolly % this.tilesize > this.tilesize - (this.screeny % this.tilesize)) {
            rangey += 1;
        }

        for (let y = 0; y < rangey; y++) {
            for (let x = 0; x < rangex; x++) {
                const a = this.gamemap[(tileoffx + x) + ((tileoffy + y) * (this.gamemapw))];
                // console.log(a);
                backgroundTiles.push(
                    {
                        sprite: "background", // bottom horizontal
                        position: {
                            x: x * this.tilesize - (this.scrollx % this.tilesize),
                            y: y * this.tilesize - (this.scrolly % this.tilesize)
                        },
                        oldPosition: {
                            x: x * this.tilesize - (this.scrollx % this.tilesize),
                            y: y * this.tilesize - (this.scrolly % this.tilesize)
                        },

                        frame: { x: a % this.tileratio, y: Math.floor(a / this.tileratio) },
                        flip: false,
                        blendmode: Game.BLENDMODE_ALPHA,
                        options: {}
                    }
                );

            }
        }


        this.renderables = {
            layers: [

                {
                    blendmode: Game.BLENDMODE_ALPHA,
                    objs: backgroundTiles,
                },

                // TODO --------------------------- BLOOD DEBRIS STAINS

                // TODO  --------------------------- SELECTION WIDGETS


                {
                    // --------------------------- ALIEN TEXTURE LAYER
                    blendmode: Game.BLENDMODE_ALPHA,
                    objs: aliens,
                },

                // TODO --------------------------- LIGHTING

                // {
                //     // --------------------------- FOG OF WAR
                //     blendmode: Game.BLENDMODE_MULTIPLY,
                //     objs: [
                //         {
                //             sprite: "white",
                //             position: { x: 0, y: 0 },
                //             oldPosition: { x: 0, y: 0 },
                //             frame: { x: 0, y: 0 },
                //             flip: false,
                //             blendmode: Game.BLENDMODE_ALPHA,
                //             options: {
                //                 scalex: 512, scaley: 240,
                //                 u_color: [0.5, 0.125, 0.25, 1]
                //             }
                //         },
                //         {
                //             sprite: "halo",
                //             position: { x: 128, y: 80 },
                //             oldPosition: { x: 128, y: 80 },
                //             frame: { x: 0, y: 0 },
                //             flip: false,
                //             blendmode: Game.BLENDMODE_ADDITIVE,
                //             options: {}
                //         }
                //     ]
                // },


                // {
                //     // --------------------------- ALIEN TEXTURE LAYER
                //     blendmode: Game.BLENDMODE_ALPHA,
                //     objs: aliens,
                // },


                // TODO ------- CURSOR & SELECTION SQUARE 
                {
                    // --------------------------- ALIEN TEXTURE LAYER
                    blendmode: Game.BLENDMODE_ALPHA,
                    objs: cursor,
                },


                // TODO -------------------------- GUI

                // TODO -------------------------- MINIMAP       

            ]
        }
    }

    resize(w: number, h: number, noDebounce?: boolean): void {
        if (noDebounce) {
            this.calculateResize(w, h);
        } else {
            if (this._resizeTimer) {
                clearTimeout(this._resizeTimer);
            }
            this._resizeTimer = setTimeout(() => {
                this.calculateResize(w, h); // Debounced
            }, 100);
        }
    }

    public calculateResize(w: number, h: number): void {

        let newWidth, newHeight;

        // Calculate the dimensions maintaining the aspect ratio
        if (w / h < this.aspectRatio) {
            // Width is the limiting factor
            newWidth = w;
            newHeight = newWidth / this.aspectRatio;
        } else {
            // Height is the limiting factor
            newHeight = h;
            newWidth = newHeight * this.aspectRatio;
        }

        // Set canvas dimensions
        this.canvasElement.width = newWidth;
        this.canvasElement.height = newHeight;
        this.canvasRect = this.canvasElement.getBoundingClientRect();

        const wRatio = newWidth / (newHeight / Constants.GAME_HEIGHT);
        this.worldSpaceMatrix = new M3x3().translation(-1, 1).scale(2 / wRatio, -2 / Constants.GAME_HEIGHT);
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
        }
        if (this.keysPressed['ArrowDown'] || this.keysPressed['s']) {
            // playerY += playerSpeed * deltaTime;
        }
        if (this.keysPressed['ArrowLeft'] || this.keysPressed['a']) {
            // playerX -= playerSpeed * deltaTime;
            this.changeOrientation(false);
        }
        if (this.keysPressed['ArrowRight'] || this.keysPressed['d']) {
            // playerX += playerSpeed * deltaTime;
            this.changeOrientation(true);
        }
    }

    public procgame(): void {

        if (this.gameaction) {

            switch (this.gameaction) {
                case this.DEFAULTACTION:
                    this.trydefault()
                    break;
                case this.RELEASESEL:
                    this.tryselect()
                    break;

                default:
                    break;
            }

        }

        this.gameaction = 0 // -------------- no more game actions to do

        // Scroll if not selected    
        if (!this.selecting) {
            this.scrollx += this.scrollnowx;
            this.scrolly += this.scrollnowy;
            if (this.scrollx > this.maxscrollx) {
                this.scrollx = this.maxscrollx;
            }
            if (this.scrollx < 0) {
                this.scrollx = 0;
            }
            if (this.scrolly > this.maxscrolly) {
                this.scrolly = this.maxscrolly;
            }
            if (this.scrolly < 0) {
                this.scrolly = 0;
            }
        }
    }

    update(timestamp: number, skipRender?: boolean): void {

        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.tickAccumulator += deltaTime;
        this.animAccumulator += deltaTime;

        this.procgame();

        while (this.animAccumulator >= this.timePerAnim) {
            this.animateCursor();
            this.animAccumulator -= this.timePerAnim;
        }

        while (this.tickAccumulator >= this.timePerTick) {
            this.tick();
            this.tickAccumulator -= this.timePerTick;
        }

        if (!skipRender) {
            this.gatherRenderables();
            this.render(this.tickAccumulator / this.timePerTick);
        }

        // Calculate FPS
        if (timestamp - this.fpsLastTime > this.fpsInterval) {
            this.fps = Math.round(1000 / deltaTime);
            this.fpsLastTime = timestamp;
            // console.log('RFA FPS ', this.fps); // 30
        }
    }

    public checkUpdate(): void {
        // Checks for needed ticks to be computed if game is minimized
        const timestamp = performance.now();
        const deltaTime = timestamp - this.lastTime;
        if ((this.tickAccumulator + deltaTime) < this.timerTriggerAccum) {
            return;
        }
        // It's been a while, game is minimized: update without rendering.
        this.update(timestamp, true);
    }

    tick(): void {


        // Advance game states in pool:
        // meaning, from currentTick count, to the next one.

        // #########################################

        let processed = 0;
        let entity;
        for (let i = 0; processed < this.entities.active || i < this.entities.total; i++) {
            entity = this.entities.pool[i];
            if (entity.active) {
                processed += 1;
                this.ai.process(entity);
            }
        }

        this.checkKeys();

        // Update currentTick count
        this.currentTick += 1;
    }

    public animateCursor(): void {
        // Animate at 15 FPS

        // Cursor
        if (this.curanim) {
            this.curanim += 1;
            if (this.curanim > this.curanimtotal)
                this.curanim = 0
        }

    }

    interpolate(min: Point, max: Point, fract: number): Point {
        return new Point(max.x + (min.x - max.x) * fract, max.y + (min.y - max.y) * fract);
    }

    render(interpolation: number): void {

        // Clear back-buffer and render onto the back-buffer,
        // adding it to final-buffer, for each layer in rendertables.

        // Clear finalBuffer to remove last frame rendered
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0); // Set base buffer color to black 
        this.setBuffer(this.finalBuffer);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        this.gl.clearColor(0.0, 0.0, 0.0, 0.0); // Set base buffer color to black fully transparent

        for (let l = 0; l < this.renderables.layers.length; l++) {
            const layer = this.renderables.layers[l];

            this.setBuffer(this.backBuffer);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT); // clear BACK BUFFER from last usage

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

    public drawselection(): void {
        //
        // glVertex2i(selx,sely)
        // glVertex2i(selx,cury)
        // glVertex2i(curx,cury)
        // glVertex2i(curx,sely)
    }

    public trydefault(): void {
        // TODO : Replace with real default action
        // TEST CURSOR ANIMATION ON DEFAULT ACTION
        this.curanim = 1;
        this.curanimx = this.gamecurx - 32;
        this.curanimy = this.gamecury - 32;
    }

    public tryselect(): void {
        // 
    }

    public mouseDown(event: MouseEvent): void {
        this.setCursorPos(event);
        this.gamecurx = this.curx + this.scrollx;
        this.gamecury = this.cury + this.scrolly;
        if (!this.selecting) {
            if (event.button == 0) {
                this.selecting = true;
                this.selx = this.curx;
                this.sely = this.cury;
            }
            if (event.button == 2) {
                this.gameaction = this.DEFAULTACTION;
            }
        }
    }

    public mouseUp(event: MouseEvent): void {
        this.setCursorPos(event);
        this.gameselx = this.selx + this.scrollx;
        this.gamesely = this.sely + this.scrolly;
        this.gamecurx = this.curx + this.scrollx;
        this.gamecury = this.cury + this.scrolly;
        if (event.button == 0) {
            this.selecting = false;
            this.gameaction = this.RELEASESEL;
        }
    }

    public mouseMove(event: MouseEvent): void {
        this.setCursorPos(event);
        this.scrollnowx = 0;
        this.scrollnowy = 0;
        if (this.curx > this.xscr_e) {
            this.scrollnowx = this.SCROLLSPEED;
        }
        if (this.cury > this.yscr_e) {
            this.scrollnowy = this.SCROLLSPEED;
        }
        if (this.curx < this.SCROLLBORDER) {
            this.scrollnowx = -this.SCROLLSPEED;
        }
        if (this.cury < this.SCROLLBORDER) {
            this.scrollnowy = -this.SCROLLSPEED;
        }
    }

    public setCursorPos(event: MouseEvent): void {
        this.curx = (event.clientX - this.canvasRect.left) * (this.screenx / this.canvasRect.width);
        this.cury = (event.clientY - this.canvasRect.top) * (this.screeny / this.canvasRect.height);
    }

    public test(): void {
        console.log('This is a test');
    }

}

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



/**
 * Singleton Entities Object Pool
 */
export class Entities {

    public total: number;
    public active: number = 0;
    public pool: Array<TEntity> = [];
    private lastId = 0;

    constructor(initialPoolSize: number) {
        this.total = initialPoolSize;
        for (let i = 0; i < initialPoolSize; i++) {
            this.pool.push({
                id: 0,
                type: 0,
                hitPoints: 0,
                state: 0,
                x: 0,
                y: 0,
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

    spawn(): TEntity {
        if (this.active === this.total) {
            throw new Error("Pool Full");
        }
        const entity = this.pool.find(e => !e.active);
        if (entity) {
            entity.active = true;
            entity.id = ++this.lastId;
            this.active++;
            return entity;
        } else {
            throw new Error("Pool Full");
        }
    }

    remove(entity: TEntity): void {
        this.active--;
        entity.active = false;
    }


}
export class AI {

    public game: Game;

    constructor(game: Game) {
        this.game = game;
    }

    public process(entity: TEntity): void {
        switch (entity.type) {
            case 1:
                this.alien(entity)
                break;

            default:
                break;
        }
    }

    private alien(entity: TEntity): void {
        // test just move forward in animations
        // 249 is the number of frames in the sprite sheet
        entity.frameIndex = (entity.frameIndex + 1) % 249;
        entity.orientation = this.game.testSpriteOrientation;
        // TODO : Add more behaviors!
    }


}
