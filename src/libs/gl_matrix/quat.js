"use strict"

import register from "../../util/register.js";

import vec3_fact from "./vec3.js";
import vec4_fact from "./vec4.js";
import mat3_fact from "./mat3.js";

/**
 * @module Quaternion
 * @name quat
 */
function Quat(ns, exports) {

var vec3 = vec3_fact(ns);
var vec4 = vec4_fact(ns);
var mat3 = mat3_fact(ns);

var GLMAT_EPSILON = 0.0000001;
var GLMAT_ARRAY_TYPE = (typeof Float32Array !== 'undefined') ? Float32Array : Array;
var GLMAT_RANDOM = Math.random;

/* Copyright (c) 2015, Brandon Jones, Colin MacKenzie IV.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE. */

var quat = exports;

/**
 * Creates a new identity quat
 *
 * @returns {Quat} a new quaternion
 * @method module:quat.create
 */
quat.create = function() {
    var out = new GLMAT_ARRAY_TYPE(4);
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Sets a quaternion to represent the shortest rotation from one
 * vector to another.
 *
 * Both vectors are assumed to be unit length.
 *
 * @param {Vec3} a the initial vector
 * @param {Vec3} b the destination vector
 * @returns {Quat} out
 * @param {Quat} out the receiving quaternion.
 * @method module:quat.rotationTo
 */
quat.rotationTo = (function() {
    var tmpvec3 = vec3.create();
    var xUnitVec3 = vec3.fromValues(1,0,0);
    var yUnitVec3 = vec3.fromValues(0,1,0);

    return function(a, b, out) {
        var dot = vec3.dot(a, b);
        if (dot < -0.9999999) {
            vec3.cross(xUnitVec3, a, tmpvec3); /* NOTE: CUSTOM REORDER: (tmpvec3, xUnitVec3, a)->(xUnitVec3, a ,tmpvec3) */
            if (vec3.length(tmpvec3) < 0.000001)
                vec3.cross(yUnitVec3, a, tmpvec3); /* NOTE: CUSTOM REORDER: (tmpvec3, yUnitVec3, a)->(yUnitVec3, a ,tmpvec3) */
            vec3.normalize(tmpvec3, tmpvec3);
            quat.setAxisAngle(tmpvec3, Math.PI, out); /* NOTE: CUSTOM REORDER: (out, tmpvec3, Math.PI)->(tmpvec3, Math.PI ,out)*/
            return out;
        } else if (dot > 0.9999999) {
            out[0] = 0;
            out[1] = 0;
            out[2] = 0;
            out[3] = 1;
            return out;
        } else {
            vec3.cross(a, b, tmpvec3); /* NOTE: CUSTOM REORDER: (tmpvec3, a, b)->(a, b ,tmpvec3) */
            out[0] = tmpvec3[0];
            out[1] = tmpvec3[1];
            out[2] = tmpvec3[2];
            out[3] = 1 + dot;
            return quat.normalize(out, out);
        }
    };
})();

/**
 * Sets the specified quaternion with values corresponding to the given
 * axes. Each axis is a vec3 and is expected to be unit length and
 * perpendicular to all other specified axes.
 *
 * @param {Vec3} view  the vector representing the viewing direction
 * @param {Vec3} right the vector representing the local "right" direction
 * @param {Vec3} up    the vector representing the local "up" direction
 * @returns {Quat} out
 * @method module:quat.setAxes
 */
quat.setAxes = (function() {
    var matr = mat3.create();

    return function(view, right, up, out) {
        matr[0] = right[0];
        matr[3] = right[1];
        matr[6] = right[2];

        matr[1] = up[0];
        matr[4] = up[1];
        matr[7] = up[2];

        matr[2] = -view[0];
        matr[5] = -view[1];
        matr[8] = -view[2];

        return quat.normalize(quat.fromMat3(matr, out), out); /* NOTE: DOUBLE CUSTOM REORDER */
    };
})();

/**
 * Creates a new quat initialized with values from an existing quaternion
 *
 * @param {Quat} a quaternion to clone
 * @returns {Quat} a new quaternion
 * @function
 * @method module:quat.clone
 */
quat.clone = vec4.clone;

/**
 * Creates a new quat initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {Quat} a new quaternion
 * @function
 * @method module:quat.fromValues
 */
quat.fromValues = vec4.fromValues;

/**
 * Copy the values from one quat to another
 *
 * @param {Quat} a the source quaternion
 * @returns {Quat} out
 * @function
 * @param {Quat} out the receiving quaternion
 * @method module:quat.copy
 */
quat.copy = vec4.copy;

/**
 * Set the components of a quat to the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @param {Number} w W component
 * @returns {Quat} out
 * @function
 * @param {Quat} out the receiving quaternion
 * @method module:quat.set
 */
quat.set = vec4.set;

/**
 * Set a quat to the identity quaternion
 *
 * @returns {Quat} out
 * @param {Quat} out the receiving quaternion
 * @method module:quat.identity
 */
quat.identity = function(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
};

/**
 * Sets a quat from the given angle and rotation axis,
 * then returns it.
 *
 * @param {Vec3} axis the axis around which to rotate
 * @param {Number} rad the angle in radians
 * @returns {Quat} out
 * @param {Quat} out the receiving quaternion
 * @method module:quat.setAxisAngle
 */
quat.setAxisAngle = function(axis, rad, out) {
    rad = rad * 0.5;
    var s = Math.sin(rad);
    out[0] = s * axis[0];
    out[1] = s * axis[1];
    out[2] = s * axis[2];
    out[3] = Math.cos(rad);
    return out;
};

/**
 * Adds two quat's
 *
 * @param {Quat} a the first operand
 * @param {Quat} b the second operand
 * @returns {Quat} out
 * @function
 * @param {Quat} out the receiving quaternion
 * @method module:quat.add
 */
quat.add = vec4.add;

/**
 * Multiplies two quat's
 *
 * @param {Quat} a the first operand
 * @param {Quat} b the second operand
 * @returns {Quat} out
 * @param {Quat} out the receiving quaternion
 * @method module:quat.multiply
 */
quat.multiply = function(a, b, out) {
    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = b[0], by = b[1], bz = b[2], bw = b[3];

    out[0] = ax * bw + aw * bx + ay * bz - az * by;
    out[1] = ay * bw + aw * by + az * bx - ax * bz;
    out[2] = az * bw + aw * bz + ax * by - ay * bx;
    out[3] = aw * bw - ax * bx - ay * by - az * bz;
    return out;
};

/**
 * Alias for {@link quat.multiply}
 * @function
 * @method module:quat.mul
 */
quat.mul = quat.multiply;

/**
 * Scales a quat by a scalar number
 *
 * @param {Quat} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {Quat} out
 * @function
 * @param {Quat} out the receiving vector
 * @method module:quat.scale
 */
quat.scale = vec4.scale;

/**
 * Rotates a quaternion by the given angle about the X axis
 *
 * @param {Quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {Quat} out
 * @param {Quat} out quat receiving operation result
 * @method module:quat.rotateX
 */
quat.rotateX = function (a, rad, out) {
    rad *= 0.5; 

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw + aw * bx;
    out[1] = ay * bw + az * bx;
    out[2] = az * bw - ay * bx;
    out[3] = aw * bw - ax * bx;
    return out;
};

/**
 * Rotates a quaternion by the given angle about the Y axis
 *
 * @param {Quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {Quat} out
 * @param {Quat} out quat receiving operation result
 * @method module:quat.rotateY
 */
quat.rotateY = function (a, rad, out) {
    rad *= 0.5; 

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        by = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw - az * by;
    out[1] = ay * bw + aw * by;
    out[2] = az * bw + ax * by;
    out[3] = aw * bw - ay * by;
    return out;
};

/**
 * Rotates a quaternion by the given angle about the Z axis
 *
 * @param {Quat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {Quat} out
 * @param {Quat} out quat receiving operation result
 * @method module:quat.rotateZ
 */
quat.rotateZ = function (a, rad, out) {
    rad *= 0.5; 

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bz = Math.sin(rad), bw = Math.cos(rad);

    out[0] = ax * bw + ay * bz;
    out[1] = ay * bw - ax * bz;
    out[2] = az * bw + aw * bz;
    out[3] = aw * bw - az * bz;
    return out;
};

/**
 * Calculates the W component of a quat from the X, Y, and Z components.
 * Assumes that quaternion is 1 unit in length.
 * Any existing W component will be ignored.
 *
 * @param {Quat} a quat to calculate W component of
 * @returns {Quat} out
 * @param {Quat} out the receiving quaternion
 * @method module:quat.calculateW
 */
quat.calculateW = function (a, out) {
    var x = a[0], y = a[1], z = a[2];

    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
    return out;
};

/**
 * Calculates the dot product of two quat's
 *
 * @param {Quat} a the first operand
 * @param {Quat} b the second operand
 * @returns {Number} dot product of a and b
 * @function
 * @method module:quat.dot
 */
quat.dot = vec4.dot;

/**
 * Performs a linear interpolation between two quat's
 *
 * @param {Quat} a the first operand
 * @param {Quat} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {Quat} out
 * @function
 * @param {Quat} out the receiving quaternion
 * @method module:quat.lerp
 */
quat.lerp = vec4.lerp;

/**
 * Performs a spherical linear interpolation between two quat
 *
 * @param {Quat} a the first operand
 * @param {Quat} b the second operand
 * @param {Number} t interpolation amount between the two inputs
 * @returns {Quat} out
 * @param {Quat} out the receiving quaternion
 * @method module:quat.slerp
 */
quat.slerp = function (a, b, t, out) {
    // benchmarks:
    //    http://jsperf.com/quaternion-slerp-implementations

    var ax = a[0], ay = a[1], az = a[2], aw = a[3],
        bx = b[0], by = b[1], bz = b[2], bw = b[3];

    var        omega, cosom, sinom, scale0, scale1;

    // calc cosine
    cosom = ax * bx + ay * by + az * bz + aw * bw;
    // adjust signs (if necessary)
    if ( cosom < 0.0 ) {
        cosom = -cosom;
        bx = - bx;
        by = - by;
        bz = - bz;
        bw = - bw;
    }
    // calculate coefficients
    if ( (1.0 - cosom) > 0.000001 ) {
        // standard case (slerp)
        omega  = Math.acos(cosom);
        sinom  = Math.sin(omega);
        scale0 = Math.sin((1.0 - t) * omega) / sinom;
        scale1 = Math.sin(t * omega) / sinom;
    } else {        
        // "from" and "to" quaternions are very close 
        //  ... so we can do a linear interpolation
        scale0 = 1.0 - t;
        scale1 = t;
    }
    // calculate final values
    out[0] = scale0 * ax + scale1 * bx;
    out[1] = scale0 * ay + scale1 * by;
    out[2] = scale0 * az + scale1 * bz;
    out[3] = scale0 * aw + scale1 * bw;
    
    return out;
};

/**
 * Performs a spherical linear interpolation with two control points
 *
 * @param {Quat} a the first operand
 * @param {Quat} b the second operand
 * @param {Quat} c the third operand
 * @param {Quat} d the fourth operand
 * @param {Number} t interpolation amount
 * @returns {Quat} out
 * @param {Quat} out the receiving quaternion
 * @method module:quat.sqlerp
 */
quat.sqlerp = (function () {
  var temp1 = quat.create();
  var temp2 = quat.create();
  
  return function (a, b, c, d, t, out) {
    quat.slerp(a, d, t, temp1); /* NOTE: CUSTOM REORDER: */
    quat.slerp(b, c, t, temp2); /* NOTE: CUSTOM REORDER: */
    quat.slerp(temp1, temp2, 2 * t * (1 - t), out); /* NOTE: CUSTOM REORDER:*/
    
    return out;
  };
}());

/**
 * Calculates the inverse of a quat
 *
 * @param {Quat} a quat to calculate inverse of
 * @returns {Quat} out
 * @param {Quat} out the receiving quaternion
 * @method module:quat.invert
 */
quat.invert = function(a, out) {
    var a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3],
        dot = a0*a0 + a1*a1 + a2*a2 + a3*a3,
        invDot = dot ? 1.0/dot : 0;
    
    // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

    out[0] = -a0*invDot;
    out[1] = -a1*invDot;
    out[2] = -a2*invDot;
    out[3] = a3*invDot;
    return out;
};

/**
 * Calculates the conjugate of a quat
 * If the quaternion is normalized, this function is faster than quat.inverse and produces the same result.
 *
 * @param {Quat} a quat to calculate conjugate of
 * @returns {Quat} out
 * @param {Quat} out the receiving quaternion
 * @method module:quat.conjugate
 */
quat.conjugate = function (a, out) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = a[3];
    return out;
};

/**
 * Calculates the length of a quat
 *
 * @param {Quat} a vector to calculate length of
 * @returns {Number} length of a
 * @function
 * @method module:quat.length
 */
quat.length = vec4.length;

/**
 * Alias for {@link quat.length}
 * @function
 * @method module:quat.len
 */
quat.len = quat.length;

/**
 * Calculates the squared length of a quat
 *
 * @param {Quat} a vector to calculate squared length of
 * @returns {Number} squared length of a
 * @function
 * @method module:quat.squaredLength
 */
quat.squaredLength = vec4.squaredLength;

/**
 * Alias for {@link quat.squaredLength}
 * @function
 * @method module:quat.sqrLen
 */
quat.sqrLen = quat.squaredLength;

/**
 * Normalize a quat
 *
 * @param {Quat} a quaternion to normalize
 * @returns {Quat} out
 * @function
 * @param {Quat} out the receiving quaternion
 * @method module:quat.normalize
 */
quat.normalize = vec4.normalize;

/**
 * Creates a quaternion from the given 3x3 rotation matrix.
 *
 * NOTE: The resultant quaternion is not normalized, so you should be sure
 * to renormalize the quaternion yourself where necessary.
 *
 * @param {Mat3} m rotation matrix
 * @returns {Quat} out
 * @function
 * @param {Quat} out the receiving quaternion
 * @method module:quat.fromMat3
 */
quat.fromMat3 = function(m, out) {
    // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
    // article "Quaternion Calculus and Fast Animation".
    var fTrace = m[0] + m[4] + m[8];
    var fRoot;

    if ( fTrace > 0.0 ) {
        // |w| > 1/2, may as well choose w > 1/2
        fRoot = Math.sqrt(fTrace + 1.0);  // 2w
        out[3] = 0.5 * fRoot;
        fRoot = 0.5/fRoot;  // 1/(4w)
        out[0] = (m[5]-m[7])*fRoot;
        out[1] = (m[6]-m[2])*fRoot;
        out[2] = (m[1]-m[3])*fRoot;
    } else {
        // |w| <= 1/2
        var i = 0;
        if ( m[4] > m[0] )
          i = 1;
        if ( m[8] > m[i*3+i] )
          i = 2;
        var j = (i+1)%3;
        var k = (i+2)%3;
        
        fRoot = Math.sqrt(m[i*3+i]-m[j*3+j]-m[k*3+k] + 1.0);
        out[i] = 0.5 * fRoot;
        fRoot = 0.5 / fRoot;
        out[3] = (m[j*3+k] - m[k*3+j]) * fRoot;
        out[j] = (m[j*3+i] + m[i*3+j]) * fRoot;
        out[k] = (m[k*3+i] + m[i*3+k]) * fRoot;
    }
    
    return out;
};

/**
 * Returns a string representation of a quatenion
 *
 * @param {Quat} vec vector to represent as a string
 * @returns {String} string representation of the vector
 * @method module:quat.str
 */
quat.str = function (a) {
    return 'quat(' + a[0] + ', ' + a[1] + ', ' + a[2] + ', ' + a[3] + ')';
};

}


var quat_factory = register("quat", Quat);
register("__quat", Quat);

export default quat_factory;