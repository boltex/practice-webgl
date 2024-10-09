export class Point {

    public x: number;
    public y: number;

    constructor(x = 0.0, y = 0.0) {
        this.x = x;
        this.y = y;
    }

}
export class M3x3 {

    public static M00 = 0;
    public static M01 = 1;
    public static M02 = 2;
    public static M10 = 3;
    public static M11 = 4;
    public static M12 = 5;
    public static M20 = 6;
    public static M21 = 7;
    public static M22 = 8;

    public matrix: [
        number, number, number,
        number, number, number,
        number, number, number,
    ];

    constructor() {
        this.matrix = [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ];
    }

    multiply(m: M3x3): M3x3 {
        const output = new M3x3();
        output.matrix = [
            this.matrix[M3x3.M00] * m.matrix[M3x3.M00] + this.matrix[M3x3.M10] * m.matrix[M3x3.M01] + this.matrix[M3x3.M20] * m.matrix[M3x3.M02],
            this.matrix[M3x3.M01] * m.matrix[M3x3.M00] + this.matrix[M3x3.M11] * m.matrix[M3x3.M01] + this.matrix[M3x3.M21] * m.matrix[M3x3.M02],
            this.matrix[M3x3.M02] * m.matrix[M3x3.M00] + this.matrix[M3x3.M12] * m.matrix[M3x3.M01] + this.matrix[M3x3.M22] * m.matrix[M3x3.M02],

            this.matrix[M3x3.M00] * m.matrix[M3x3.M10] + this.matrix[M3x3.M10] * m.matrix[M3x3.M11] + this.matrix[M3x3.M20] * m.matrix[M3x3.M12],
            this.matrix[M3x3.M01] * m.matrix[M3x3.M10] + this.matrix[M3x3.M11] * m.matrix[M3x3.M11] + this.matrix[M3x3.M21] * m.matrix[M3x3.M12],
            this.matrix[M3x3.M02] * m.matrix[M3x3.M10] + this.matrix[M3x3.M12] * m.matrix[M3x3.M11] + this.matrix[M3x3.M22] * m.matrix[M3x3.M12],

            this.matrix[M3x3.M00] * m.matrix[M3x3.M20] + this.matrix[M3x3.M10] * m.matrix[M3x3.M21] + this.matrix[M3x3.M20] * m.matrix[M3x3.M22],
            this.matrix[M3x3.M01] * m.matrix[M3x3.M20] + this.matrix[M3x3.M11] * m.matrix[M3x3.M21] + this.matrix[M3x3.M21] * m.matrix[M3x3.M22],
            this.matrix[M3x3.M02] * m.matrix[M3x3.M20] + this.matrix[M3x3.M12] * m.matrix[M3x3.M21] + this.matrix[M3x3.M22] * m.matrix[M3x3.M22]
        ];
        return output;
    }

    translation(x: number, y: number): M3x3 {
        const output = new M3x3();
        output.matrix = [
            this.matrix[M3x3.M00],
            this.matrix[M3x3.M01],
            this.matrix[M3x3.M02],
            this.matrix[M3x3.M10],
            this.matrix[M3x3.M11],
            this.matrix[M3x3.M12],

            x * this.matrix[M3x3.M00] + y * this.matrix[M3x3.M10] + this.matrix[M3x3.M20],
            x * this.matrix[M3x3.M01] + y * this.matrix[M3x3.M11] + this.matrix[M3x3.M21],
            x * this.matrix[M3x3.M02] + y * this.matrix[M3x3.M12] + this.matrix[M3x3.M22]
        ];
        return output;
    }

    scale(x: number, y: number): M3x3 {
        const output = new M3x3();
        output.matrix = [
            this.matrix[M3x3.M00] * x,
            this.matrix[M3x3.M01] * x,
            this.matrix[M3x3.M02] * x,

            this.matrix[M3x3.M10] * y,
            this.matrix[M3x3.M11] * y,
            this.matrix[M3x3.M12] * y,

            this.matrix[M3x3.M20],
            this.matrix[M3x3.M21],
            this.matrix[M3x3.M22]
        ];
        return output;
    }

    getFloatArray(): Float32Array {
        return new Float32Array(this.matrix);
    }


}

