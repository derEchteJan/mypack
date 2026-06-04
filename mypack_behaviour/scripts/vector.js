import { chat } from './logging.js'

/**
 * 3d custom vector for mypack
 */
export default class Vector3
{
    x = 0;
    y = 0;
    z = 0;

    constructor(a, b, c)
    {
        if(typeof a === 'object' || a instanceof Vector3)
        {
            this.x = (typeof a.x === 'number') ? a.x : 0;
            this.y = (typeof a.y === 'number') ? a.y : 0;
            this.z = (typeof a.z === 'number') ? a.z : 0;
        }
        else 
        {
            this.x = (typeof a === 'number') ? a : 0;
            this.y = (typeof b === 'number') ? b : 0;
            this.z = (typeof c === 'number') ? c : 0;
        }
    }

    static distance(vec1, vec2)
    {
        var diff = new Vector3();
        diff.x = vec1.x - vec2.x;
        diff.y = vec1.y - vec2.y;
        diff.z = vec1.z - vec2.z;
        return diff.magnitude();
    }

    set_to(vec)
    {
        this.x = vec.x;
        this.y = vec.y;
        this.z = vec.z;
    }

    is_nan()
    {
        return isNaN(this.x) || isNaN(this.y) || isNaN(this.z);
    }

    /** Returns the length / magnitude of the vector
     * @returns {Number} Number
     */
    magnitude()
    {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    /** Scales vector to a length of unit vector
     */
    normalize()
    {
        this.scale(1 / this.magnitude());
    }

    /** Scales vector length by given factor
     * @param {Number} factor 
     */
    scale(factor)
    {
        this.x *= factor;
        this.y *= factor;
        this.z *= factor;
    }

    /** Rounds coordinates to 2 decimals
     */
    round()
    {
        this.x = Math.round(this.x * 100) / 100;
        this.y = Math.round(this.y * 100) / 100;
        this.z = Math.round(this.z * 100) / 100;
    }

    project_onto(vec)
    {
        var a = this;
        var b = new Vector3();
        b.set_to(vec);
        var dp = a.dot(b);
        var bmag = b.magnitude();
        var scale = dp / (bmag * bmag);
        b.scale(scale);
        b.round();
        this.set_to(b);
    }

    ortho_project_onto(vec)
    {
        var copy = new Vector3();
        copy.set_to(this);
        this.project_onto(vec);
        copy.subtract(this);
        this.set_to(copy);
        this.round();
    }

    /** Returns dot product of this and other vector
     * @param {Vector3} vec other vector
     * @returns {Number} dot product
     */
    dot(vec)
    {
        return (this.x * vec.x) + (this.y * vec.y) + (this.z * vec.z);
    }

    add(vec, factor)
    {
        factor = (typeof factor === 'number') ? factor : 1;
        this.x += vec.x * factor;
        this.y += vec.y * factor;
        this.z += vec.z * factor;
    }

    subtract(vec)
    {
        this.x -= vec.x;
        this.y -= vec.y;
        this.z -= vec.z;
    }

    to_string()
    {
        return "{ " + this.x + ", " + this.y + ", " + this.z + " }";
    }
}