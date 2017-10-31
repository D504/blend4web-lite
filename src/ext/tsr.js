/**
 * Copyright (C) 2014-2017 Triumph LLC
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
"use strict";

import register from "../util/register.js";

import m_mat4_fact from "../libs/gl_matrix/mat4.js";
import m_tsr_fact from "../tsr.js";

/** 
 * {@link TSR} (translation, scale, rotation} utility routines.
 * @module tsr
 * @see https://www.blend4web.com/doc/en/objects.html#moving-via-tsr-vectors
 */
function TSR(ns, exports) {

var m_mat4  = m_mat4_fact(ns);
var m_tsr   = m_tsr_fact(ns);

/**
 * Create a new identity TSR vector.
 * @method module:tsr.create
 * @returns {TSR} New TSR vector
 */
exports.create = m_tsr.create;

/**
 * Create a new TSR vector from given values.
 * @method module:tsr.from_values
 * @param {number} x X translation.
 * @param {number} y Y translation.
 * @param {number} z Z translation.
 * @param {number} s Scale.
 * @param {number} qx X quaternion rotation.
 * @param {number} qy Y quaternion rotation.
 * @param {number} qz Z quaternion rotation.
 * @param {number} qw W quaternion rotation.
 * @returns {TSR} New TSR vector
 */
exports.from_values = m_tsr.from_values;

/**
 * Copy one TSR vector to another.
 * @method module:tsr.copy
 * @param {TSR} tsr Source TSR vector
 * @param {TSR} tsr2 Destination TSR vector
 */
exports.copy = m_tsr.copy;

/**
 * Set TSR to identity.
 * @method module:tsr.identity
 * @param {TSR} tsr TSR vector
 */
exports.identity = m_tsr.identity;

/**
 * Set TSR from separate trans, scale and quat.
 * @method module:tsr.set_sep
 * @param {Vec3} trans Translation vector
 * @param {number} scale Scale
 * @param {Quat} quat Rotation quaternion
 * @param {TSR} [dest] Destination TSR vector
 * @returns {TSR} dest Destination TSR vector
 */
exports.set_sep = m_tsr.set_sep;
function set_sep(trans, scale, quat, dest) {
    if (!dest)
        dest = m_tsr.create();

    set_sep(trans, scale, quat, dest);

    return dest;
}

/**
 * Set TSR translation.
 * @method module:tsr.set_trans
 * @param {Vec3} trans Translation vector
 * @param {TSR} dest Destination TSR vector
 */
exports.set_trans = m_tsr.set_trans;
/**
 * Set TSR scale.
 * @method module:tsr.set_scale
 * @param {number} scale Scale
 * @param {TSR} dest Destination TSR vector
 */
exports.set_scale = m_tsr.set_scale;
/**
 * Set TSR translation and scale from vec4.
 * @method module:tsr.set_transcale
 * @param {Vec4} transcale Translation+Scale vector
 * @param {TSR} dest Destination TSR vector
 */
exports.set_transcale = m_tsr.set_transcale ;
/**
 * Set TSR quaternion.
 * @method module:tsr.set_quat
 * @param {Quat} quat Rotation quaternion
 * @param {TSR} dest Destination TSR vector
 */
exports.set_quat = m_tsr.set_quat;

/**
 * Get ArrayBufferView from translation part of TSR.
 * @method module:tsr.get_trans_view
 * @param {TSR} tsr TSR vector
 * @returns {Vec3} Translation part of TSR
 */
exports.get_trans_view = m_tsr.get_trans_view;
/**
 * Get TSR scale.
 * @method module:tsr.get_scale
 * @returns {number} Scale
 */
exports.get_scale = m_tsr.get_scale;
/**
 * Get ArrayBufferView from quaternion part of TSR.
 * @method module:tsr.get_quat_view
 * @returns {Quat} Quaternion part of TSR
 */
exports.get_quat_view = m_tsr.get_quat_view;

/**
 * Calculates the inverse of TSR.
 * @method module:tsr.invert
 * @param {TSR} tsr TSR vector
 * @param {TSR} dest Destination TSR vector
 * @returns {TSR} Destination TSR vector
 */
exports.invert = m_tsr.invert;


/**
 * Create mat4 from TSR.
 * Not optimized.
 * @method module:tsr.to_mat4
 * @param {TSR} tsr TSR vector.
 * @param {?Mat4} [dest=mat4.create()] Destination matrix.
 * @returns {Mat4} Destination matrix.
 */
exports.to_mat4 = function(tsr, dest) {
    if (!dest)
        dest = m_mat4.create();

    m_tsr.to_mat4(tsr, dest);
    return dest;
}

/**
 * Set TSR from mat4.
 * Not optimized.
 * @method module:tsr.from_mat4
 * @param {Mat4} mat Matrix.
 * @param {TSR} dest Destination TSR vector.
 * @returns {TSR} Destination TSR vector.
 */
exports.from_mat4 = m_tsr.from_mat4;

/**
 * Multiply two TSRs.
 * @method module:tsr.multiply
 * @param {TSR} tsr First TSR vector
 * @param {TSR} tsr2 Second TSR vector
 * @param {TSR} dest Destination TSR vector
 * @returns {TSR} Destination TSR vector
 */
exports.multiply = m_tsr.multiply;

/**
 * Transform vec3 by TSR.
 * @method module:tsr.transform_vec3
 * @param {Vec3} trans Vector to transform
 * @param {TSR} tsr TSR vector
 * @param {Vec3} dest Destination vector
 */
exports.transform_vec3 = m_tsr.transform_vec3;

/**
 * Transform vec3 by inverse TSR.
 * @method module:tsr.transform_vec3_inv
 * @param {Vec3} trans Vector to transform
 * @param {TSR} tsr TSR vector
 * @param {Vec3} dest Destination vector
 */
exports.transform_vec3_inv = m_tsr.transform_vec3_inv;

/**
 * Transform vec3 vectors by TSR.
 * optional destination offset in values (not vectors, not bytes)
 * @method module:tsr.transform_vectors
 * @param {Float32Array} vectors Array of vectors to transform
 * @param {TSR} tsr TSR vector
 * @param {Float32Array} new_vectors Destination array of vectors
 * @param {number} [dest_offset=0] Offset in new_vectors array
 * @returns {Float32Array} Destination array of vectors
 */
exports.transform_vectors = m_tsr.transform_vectors;
/**
 * Transform directional vec3 vectors by TSR.
 * optional destination offset in values (not vectors, not bytes)
 * @method module:tsr.transform_dir_vectors
 * @param {Float32Array} vectors Array of vectors to transform
 * @param {TSR} tsr TSR vector
 * @param {Float32Array} new_vectors Destination array of vectors
 * @param {number} [dest_offset=0] Offset in new_vectors array
 * @returns {Float32Array} Destination array of vectors
 */
exports.transform_dir_vectors = m_tsr.transform_dir_vectors;
/**
 * Transform directional vec3 by TSR.
 * @method module:tsr.transform_dir_vec3
 * @param {Vec3} trans Vector to transform
 * @param {TSR} tsr TSR vector
 * @param {Vec3} dest Destination vector
 */
exports.transform_dir_vec3 = m_tsr.transform_dir_vec3;

/**
 * Transform 4 comp tangent vectors by matrix.
 * optional destination offset in values (not vectors, not bytes)
 * @method module:tsr.transform_tangents
 * @param {Float32Array} vectors Array of vectors to transform
 * @param {TSR} tsr TSR vector
 * @param {Float32Array} new_vectors Destination array of vectors
 * @param {number} [dest_offset=0] Offset in new_vectors array
 * @returns {Float32Array} Destination array of vectors
 */
exports.transform_tangents = m_tsr.transform_tangents;

/**
 * Perform TSR translation by given vec3.
 * @method module:tsr.translate
 * @param {TSR} tsr TSR vector
 * @param {Vec3} trans Translation vector
 * @param {TSR} dest Destination TSR vector
 * @returns {TSR} Destination TSR vector
 */
exports.translate = m_tsr.translate;

/**
 * Perform interpolation between two TSR vectors.
 * @method module:tsr.interpolate
 * @param {TSR} tsr First TSR vector
 * @param {TSR} tsr2 Second TSR vector
 * @param {number} factor Interpolation factor
 * @param {TSR} dest Destination TSR vector
 * @returns {TSR} Destination TSR vector
 */
exports.interpolate = function(tsr, tsr2, factor, dest) {
    if (!dest)
        dest = m_tsr.create();

    m_tsr.interpolate(tsr, tsr2, factor, dest);

    return dest;
}

}

var tsr_factory = register("tsr", TSR);

export default tsr_factory;
