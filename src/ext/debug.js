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

/**
 * Engine debugging API.
 * @module debug
 * @local DebugViewMode
 * @local StageloadCallback
 * @local LoadedCallback
 * @local CodeTestCallback
 * @local EqualsFunction
 * @local OKFunction
 */
b4w.module["debug"] = function(exports, require) {

var m_batch    = require("__batch");
var m_cfg      = require("__config");
var m_compat   = require("__compat");
var m_ctl      = require("__controls");
var m_cont     = require("__container");
var m_data     = require("__data");
var m_debug    = require("__debug");
var m_ext      = require("__extensions");
var m_geom     = require("__geometry");
var m_load     = require("__loader");
var m_obj      = require("__objects");
var m_obj_util = require("__obj_util");
var m_phy      = require("__physics");
var m_print    = require("__print");
var m_render   = require("__renderer");
var m_scenes   = require("__scenes");
var m_scgraph  = require("__scenegraph");
var m_sfx      = require("__sfx");
var m_shaders  = require("__shaders");
var m_subs     = require("__subscene");
var m_textures = require("__textures");
var m_trans    = require("__transform");
var m_tsr      = require("__tsr");
var m_util     = require("__util");
var m_vec3     = require("__vec3");

var _tsr_tmp = m_tsr.create();
var _vec2_tmp = new Float32Array(2);
var _vec3_tmp = m_vec3.create();
var _vec3_tmp2 = m_vec3.create();

var _normal_line = null;

var cfg_def = m_cfg.defaults;

var PERF_NUM_CALLS = 5;
var EPS = 0.000001;

var _called_funcs = [];
var _last_warn_message = "";
var _last_err_message = "";
var _warn_got = false;
var _err_got = false;
var _test_result = true;

var _pixel = new Uint8Array(4);

/**
 * Debug view mode.
 * @typedef {number} DebugViewMode
 */

 /**
 * Data loaded callback.
 * @callback LoadedCallback
 */

/**
 * Loading stage callback.
 * @callback StageloadCallback
 * @param {number} percentage Loading progress (0-100).
 */

/**
 * Code test callback.
 * @callback CodeTestCallback
 * @param {EqualsFunction} equals Comparison function.
 * @param {OKFunction} ok Code test function.
 */

/**
 * Return the comparison result of the given parameters.
 * @callback EqualsFunction
 * @param {*} result Real function result.
 * @param {*} exp_result Expected result.
 */

 /**
 * Check code crash.
 * @callback OKFunction
 * @param {*} result Real function result.
 */


/**
 * Debug view mode: turn off debug view.
 * @const {DebugViewMode} module:debug.DV_NONE
 */
exports.DV_NONE = m_debug.DV_NONE;

/**
 * Debug view mode: turn on the black-and-white wireframe view.
 * @const {DebugViewMode} module:debug.DV_OPAQUE_WIREFRAME
 */
exports.DV_OPAQUE_WIREFRAME = m_debug.DV_OPAQUE_WIREFRAME;

/**
 * Debug view mode: turn on the transparent (superimposed on the source color) wireframe view.
 * @const {DebugViewMode} module:debug.DV_TRANSPARENT_WIREFRAME
 */
exports.DV_TRANSPARENT_WIREFRAME = m_debug.DV_TRANSPARENT_WIREFRAME;

/**
 * Debug view mode: turn on the wireframe view with the front/back faces coloration.
 * @const {DebugViewMode} module:debug.DV_FRONT_BACK_VIEW
 */
exports.DV_FRONT_BACK_VIEW = m_debug.DV_FRONT_BACK_VIEW;

/**
 * Debug view mode: turn on the debug spheres view.
 * @const {DebugViewMode} module:debug.DV_BOUNDINGS
 */
exports.DV_BOUNDINGS = m_debug.DV_BOUNDINGS;

/**
 * Debug view mode: turn on the clusters view.
 * @const {DebugViewMode} module:debug.DV_CLUSTERS_VIEW
 */
exports.DV_CLUSTERS_VIEW = m_debug.DV_CLUSTERS_VIEW;

/**
 * Debug view mode: turn on the batches view.
 * @const {DebugViewMode} module:debug.DV_BATCHES_VIEW
 */
exports.DV_BATCHES_VIEW = m_debug.DV_BATCHES_VIEW;

/**
 * Debug view mode: turn on the render time view.
 * @const {DebugViewMode} module:debug.DV_RENDER_TIME
 */
exports.DV_RENDER_TIME = m_debug.DV_RENDER_TIME;

/**
 * Print info about the physics worker.
 * @method module:debug.physics_stats
 */
exports.physics_stats = function() {
    m_phy.debug_workers();
}

/**
 * Print object info by physics ID.
 * @method module:debug.physics_id
 * @param {number} id Physics ID
 */
exports.physics_id = function(id) {
    m_print.log("O", m_phy.find_obj_by_body_id(id))

    var act_phy_scene = m_phy.get_active_scene();

    if (!act_phy_scene) {
        m_print.error("No active physics scene.");
        return;
    }

    var bundles = act_phy_scene._physics.bundles;

    for (var i = 0; i < bundles.length; i++) {
        var bundle = bundles[i];
        var phy = bundle.physics;

        if (phy.body_id == id)
            m_print.log("B", bundle);
    }
}

/**
 * Print names and info for objects inside the view frustum.
 * @method module:debug.visible_objects
 */
exports.visible_objects = function() {
    var scene = m_scenes.get_active();

    var objs = m_obj.get_scene_objs(scene, "MESH", m_obj.DATA_ID_ALL);

    var main_subscenes = m_scenes.subs_array(scene, [m_subs.MAIN_OPAQUE,
                                                     m_subs.MAIN_BLEND,
                                                     m_subs.MAIN_GLOW]);

    for (var i = 0; i < main_subscenes.length; i++) {
        var subs_main = main_subscenes[i];
        var draw_data = subs_main.draw_data;

        if (!draw_data.length)
            continue;

        print_objs(subs_main, draw_data, objs, "DYNAMIC");
        print_objs(subs_main, draw_data, objs, "STATIC");
    }
}

function print_objs(subs, draw_data, objs, type) {

    m_print.group(m_subs.subs_label(subs), type);

    for (var j = 0; j < objs.length; j++) {
        var obj = objs[j];
        var render = obj.render;

        if (render.type != type)
            continue;

        var is_visible = false;

        for (var k = 0; k < draw_data.length; k++) {
            var bundles = draw_data[k].bundles;
            for (var m = 0; m < bundles.length; m++) {
                var bundle = bundles[m];
                if (bundle.do_render && bundle.obj_render == render) {
                    if (type == "STATIC")
                        m_print.log_raw(obj.origin_name, obj);
                    else
                        m_print.log_raw(obj.name, obj);
                    is_visible = true;
                    break;
                }
            }
            if (is_visible)
                break;
        }
    }

    m_print.groupEnd();
}

/**
 * Print debug info for the object with the given name
 * @method module:debug.object_info
 * @param {string} name Object name
 */
exports.object_info = function(name) {
    var scene = m_scenes.get_active();

    var objs = m_obj.get_scene_objs(scene, "MESH", m_obj.DATA_ID_ALL);

    for (var i = 0; i < objs.length; i++) {
        var obj = objs[i];

        if (obj.name != name)
            continue;

        m_print.log("Object", obj);

        var subscenes = m_scenes.get_all_subscenes(scene);

        for (var j = 0; j < subscenes.length; j++) {
            var subs = subscenes[j];
            var print_bundles = [];

            var draw_data = subs.draw_data;

            for (var k = 0; k < draw_data.length; k++) {
                var bundles = draw_data[k].bundles;
                for (var m = 0; m < bundles.length; m++) {
                    if (bundles[m].obj_render == obj.render)
                        print_bundles.push(bundles[m]);
                }
            }

            m_print.log("Subscene " + subs.type, print_bundles);
        }
    }
}

/**
 * Print debug info for the object with the given name
 * @method module:debug.objects_stat
 */
exports.objects_stat = function() {
    var scene = m_scenes.get_active();

    m_print.log("Armatures: " + m_obj.get_scene_objs(scene, "ARMATURE",
            m_obj.DATA_ID_ALL).length);
    m_print.log("Cameras: " + m_obj.get_scene_objs(scene, "CAMERA",
            m_obj.DATA_ID_ALL).length);
    m_print.log("Curves: " + m_obj.get_scene_objs(scene, "CURVE",
            m_obj.DATA_ID_ALL).length);
    m_print.log("Empties: " + m_obj.get_scene_objs(scene, "EMPTY",
            m_obj.DATA_ID_ALL).length);
    m_print.log("Lamps: " + m_obj.get_scene_objs(scene, "LAMP",
            m_obj.DATA_ID_ALL).length);
    m_print.log("Meshes: " + m_obj.get_scene_objs(scene, "MESH",
            m_obj.DATA_ID_ALL).length);
    m_print.log("Speakers: " + m_obj.get_scene_objs(scene, "SPEAKER",
            m_obj.DATA_ID_ALL).length);
}

/**
 * Return the number of vertices in the active scene.
 * @method module:debug.num_vertices
 * @returns {number} The number of vertices.
 */
exports.num_vertices = function() {

    var num = 0;

    var scene = m_scenes.get_active();

    var main_subscenes = m_scenes.subs_array(scene, [m_subs.MAIN_OPAQUE,
                                                     m_subs.MAIN_BLEND,
                                                     m_subs.MAIN_GLOW]);

    for (var i = 0; i < main_subscenes.length; i++) {

        var subs = main_subscenes[i];

        var draw_data = subs.draw_data;

        for (var j = 0; j < draw_data.length; j++) {
            var bundles = draw_data[j].bundles;
            for (var k = 0; k < bundles.length; k++) {

                var batch = bundles[k].batch;
                // NOTE: some objects (particles) do not have any submesh
                if (batch)
                    num += batch.num_vertices;
            }
        }
    }

    return num;
}

/**
 * Return the number of all triangles in the active scene.
 * @method module:debug.num_triangles
 * @returns {number} The number of all triangles.
 */
exports.num_triangles = function() {

    var num = 0;

    var scene = m_scenes.get_active();

    var main_subscenes = m_scenes.subs_array(scene, [m_subs.MAIN_OPAQUE,
                                                     m_subs.MAIN_BLEND,
                                                     m_subs.MAIN_GLOW]);

    for (var i = 0; i < main_subscenes.length; i++) {

        var subs = main_subscenes[i];

        var draw_data = subs.draw_data;

        for (var j = 0; j < draw_data.length; j++) {
            var bundles = draw_data[j].bundles;
            for (var k = 0; k < bundles.length; k++) {

                var batch = bundles[k].batch;
                // NOTE: some objects (particles) do not have any submesh
                if (batch)
                    num += batch.num_triangles;
            }
        }
    }

    return num;
}

/**
 * Return the number of batches in the main scenes.
 * @method module:debug.num_draw_calls
 * @returns {number} The number of batches.
 */
exports.num_draw_calls = function() {

    var scene = m_scenes.get_active();

    var main_subscenes = m_scenes.subs_array(scene, [m_subs.MAIN_OPAQUE,
                                                     m_subs.MAIN_BLEND,
                                                     m_subs.MAIN_GLOW,
                                                     m_subs.MAIN_PLANE_REFLECT,
                                                     m_subs.MAIN_PLANE_REFLECT_BLEND]);

    var number = 0;
    for (var i = 0; i < main_subscenes.length; i++) {
        var subs = main_subscenes[i];
        var draw_data = subs.draw_data;
        for (var j = 0; j < draw_data.length; j++)
            number += draw_data[j].bundles.length;
    }

    var cube_reflect_subs = m_scenes.subs_array(scene,
                            [m_subs.MAIN_CUBE_REFLECT, m_subs.MAIN_CUBE_REFLECT_BLEND]);
    for (var i = 0; i < cube_reflect_subs.length; i++) {
        var subs = cube_reflect_subs[i];
        var draw_data = subs.draw_data;
        for (var j = 0; j < draw_data.length; j++)
            number += 6 * draw_data[j].bundles.length;
    }

    return number;
}

/**
 * Return the number of compiled shaders.
 * @method module:debug.num_shaders
 * @returns {number} The number of compiled shaders.
 */
exports.num_shaders = function() {
    var compiled_shaders = m_shaders.get_compiled_shaders();
    return m_util.get_dict_length(compiled_shaders);
}

/**
 * Return geometry info in the main scenes.
 * @method module:debug.geometry_stats
 * @returns {Object} Geometry info.
 */
exports.geometry_stats = function() {

    var scene = m_scenes.get_active();
    var subscenes = m_scenes.get_all_subscenes(scene);
    var unique_batches = {};

    for (var i = 0; i < subscenes.length; i++) {

        var subs = subscenes[i];

        if (subs.type == m_subs.SINK || subs.type == m_subs.DEBUG_VIEW)
            continue;

        var draw_data = subs.draw_data;
        for (var j = 0; j < draw_data.length; j++) {
            var bundles = draw_data[j].bundles;
            for (var k = 0; k < bundles.length; k++) {
                var batch = bundles[k].batch;
                var render = bundles[k].obj_render;
                // NOTE: some objects (particles) do not have any submesh
                if (batch)
                    if (subs.type != m_subs.COLOR_PICKING && subs.type != m_subs.OUTLINE_MASK
                            || render.origin_selectable || render.origin_outlining)
                        unique_batches[batch.id] = batch;
            }
        }
    }

    var vbo_memory = 0;
    var ibo_memory = 0;

    for (var id in unique_batches) {
        var bufs_data = unique_batches[id].bufs_data;

        if (bufs_data.debug_ibo_bytes)
            ibo_memory += bufs_data.debug_ibo_bytes / (1024 * 1024);

        vbo_memory += bufs_data.debug_vbo_bytes / (1024 * 1024);
    }

    return {"vbo_memory": vbo_memory, "ibo_memory": ibo_memory};
}

/**
 * Return the number of unique textures in the main scenes.
 * @method module:debug.num_textures
 * @returns {Object} Textures info.
 */
exports.num_textures = function() {

    var tex_list = [];

    var memory = 0;

    var scene = m_scenes.get_active();

    var main_subscenes = m_scenes.subs_array(scene, [m_subs.MAIN_OPAQUE,
                                                     m_subs.MAIN_BLEND,
                                                     m_subs.MAIN_GLOW]);

    for (var i = 0; i < main_subscenes.length; i++) {

        var subs = main_subscenes[i];

        var draw_data = subs.draw_data;
        for (var j = 0; j < draw_data.length; j++) {
            var bundles = draw_data[j].bundles;
            for (var k = 0; k < bundles.length; k++) {

                var batch = bundles[k].batch;
                // NOTE: some objects (particles) do not have any submesh
                if (batch) {
                    var batch_texs = batch.textures;

                    for (var m = 0; m < batch_texs.length; m++) {

                        var batch_tex = batch_texs[m];

                        if (batch_tex.source === "IMAGE" ||
                                batch_tex.source === "ENVIRONMENT_MAP") {

                            var tex = batch_tex.w_texture;

                            if (tex_list.indexOf(tex) === -1) {
                                tex_list.push(tex);
                                var mem = batch_tex.width * batch_tex.height *
                                    4 / (1024 * 1024) / batch_tex.compress_ratio;

                                // mipmaps
                                mem *=  1.3333;

                                memory += mem;
                            }
                        }
                    }
                }
            }
        }
    }

    return {"number": tex_list.length, "memory": memory};
}

/**
 * Return the number and the total size of unique output framebuffers.
 * @method module:debug.num_render_targets
 * @returns {Object} Render targets info.
 */
exports.num_render_targets = function() {

    var list = [];

    var memory = 0;

    var scene = m_scenes.get_active();

    var subscenes = m_scenes.get_all_subscenes(scene);

    for (var i = 0; i < subscenes.length; i++) {

        var subs = subscenes[i];

        if (subs.type == m_subs.SINK)
            continue;

        var cam = subs.camera;
        var subs_textures = [cam.color_attachment, cam.depth_attachment];
        subs_textures.push.apply(subs_textures, subs.textures_internal);

        for (var j = 0; j < subs_textures.length; j++) {
            var tex = subs_textures[j];
            if (m_textures.is_texture(tex) && list.indexOf(tex) == -1) {
                list.push(tex);
                memory += cam.width * cam.height * m_textures.get_texture_texel_size(tex);
            }
        }
    }

    return {"number": list.length, "memory": (memory / 1024 / 1024)};
}

/**
 * Draw a frustum for the active camera.
 * @method module:debug.make_camera_frustum_shot
 */
exports.make_camera_frustum_shot = function() {

    var active_scene = m_scenes.get_active();
    var subs_main = m_scenes.get_subs(active_scene, m_subs.MAIN_OPAQUE);
    if (!subs_main)
        return;

    m_scenes.make_frustum_shot(subs_main.camera, subs_main, [1,1,0]);
}

/**
 * Draw a light frustum, used for rendering the shadow maps.
 * @method module:debug.make_light_frustum_shot
 */
exports.make_light_frustum_shot = function() {

    var active_scene = m_scenes.get_active();
    var subs_main = m_scenes.get_subs(active_scene, m_subs.MAIN_OPAQUE);
    var subscenes_shadow = m_scenes.subs_array(active_scene, [m_subs.SHADOW_CAST]);
    if (!subs_main)
        return;

    for (var i = 0; i < subscenes_shadow.length; i++) {
        var subs_shadow = subscenes_shadow[i];

        var color;
        switch (i) {
        case 0:
            color = [1, 0, 0];
            break;
        case 1:
            color = [0, 1, 0];
            break;
        case 2:
            color = [0, 0, 1];
            break;
        default:
            color = [1, 0, 1];
        }

        m_scenes.make_frustum_shot(subs_shadow.camera, subs_main, color);
    }
}


/**
 * Print info about the active scene graph in DOT format.
 * @method module:debug.scenegraph_to_dot
 */
exports.scenegraph_to_dot = function() {
    var scenes = m_scenes.get_all_scenes();

    for (var i = 0; i < scenes.length; i++) {
        var scene = scenes[i];
        var graph = m_scenes.get_graph(scene);
        m_print.log("\n" + m_scgraph.debug_convert_to_dot(graph));
    }
}

exports.loading_graph_to_dot = function(data_id) {
    data_id = data_id | 0;
    m_print.log("\n" + m_load.graph_to_dot(data_id));
}

/**
 * Print info about the controls module.
 * @method module:debug.controls_info
 */
exports.controls_info = m_ctl.debug;

/**
 * Get the distance between two objects.
 * @method module:debug.object_distance
 * @param {Object3D} obj The first object.
 * @param {Object3D} obj2 The second object.
 * @returns {number} Distance.
 * @deprecated use {@link module:transform.distance|transform.distance} instead.
 */
exports.object_distance = function(obj, obj2) {
    var trans = m_tsr.get_trans_view(obj.render.world_tsr);
    var trans2 = m_tsr.get_trans_view(obj2.render.world_tsr);
    var dist = m_vec3.dist(trans, trans2);
    return dist;
}

/**
 * Store a simple telemetry message.
 * @method module:debug.msg
 */
exports.msg = m_debug.msg;

/**
 * Store a flashback telemetry message.
 * @method module:debug.fbmsg
 */
exports.fbmsg = m_debug.fbmsg;

/**
 * Print the list of flashback messages.
 * @method module:debug.print_telemetry
 */
exports.print_telemetry = m_debug.print_telemetry;

/**
 * Plot the list of flashback messages as a gnuplot datafile.
 * @method module:debug.plot_telemetry
 */
exports.plot_telemetry = m_debug.plot_telemetry;

/**
 * Store the callback function result as a flashback message.
 * @method module:debug.fbres
 * @param {Function} fun fun
 * @param {number} timeout timeout
 */
exports.fbres = function(fun, timeout) {
    if (!timeout)
        timeout = 16;

    var cb = function() {
        m_debug.fbmsg("FBRES", fun());
        setTimeout(cb, timeout);
    }

    cb();
}

/**
 * Check the engine constants, abort if not constant.
 * @method module:debug.assert_constants
 */
exports.assert_constants = function() {
    var VEC3_IDENT = new Float32Array(3);
    var QUAT4_IDENT = new Float32Array([0,0,0,1]);

    var AXIS_X = new Float32Array([1, 0, 0]);
    var AXIS_Y = new Float32Array([0, 1, 0]);
    var AXIS_Z = new Float32Array([0, 0, 1]);
    var AXIS_MX = new Float32Array([-1, 0, 0]);
    var AXIS_MY = new Float32Array([ 0,-1, 0]);
    var AXIS_MZ = new Float32Array([ 0, 0,-1]);

    if (!m_util.cmp_arr(VEC3_IDENT, m_util.VEC3_IDENT))
        throw "Wrong VEC3_IDENT";
    if (!m_util.cmp_arr(QUAT4_IDENT, m_util.QUAT4_IDENT))
        throw "Wrong QUAT4_IDENT";

    if (!m_util.cmp_arr(AXIS_X, m_util.AXIS_X))
        throw "Wrong AXIS_X";
    if (!m_util.cmp_arr(AXIS_Y, m_util.AXIS_Y))
        throw "Wrong AXIS_Y";
    if (!m_util.cmp_arr(AXIS_Z, m_util.AXIS_Z))
        throw "Wrong AXIS_Z";
    if (!m_util.cmp_arr(AXIS_MX, m_util.AXIS_MX))
        throw "Wrong AXIS_MX";
    if (!m_util.cmp_arr(AXIS_MY, m_util.AXIS_MY))
        throw "Wrong AXIS_MY";
    if (!m_util.cmp_arr(AXIS_MZ, m_util.AXIS_MZ))
        throw "Wrong AXIS_MZ";
}

/**
 * Mute the BACKGROUND_MUSIC speakers.
 * @method module:debug.mute_music
 */
exports.mute_music = function() {
    var spks = m_sfx.get_speaker_objects();

    for (var i = 0; i < spks.length; i++) {
        var spk = spks[i];

        if (m_sfx.get_spk_behavior(spk) == "BACKGROUND_MUSIC")
            m_sfx.mute(spk, true);
    }
}

/**
 * Check the object for a finite value.
 * @method module:debug.check_finite
 * @param {*} o Value
 */
exports.check_finite = m_debug.check_finite;

/**
 * Set debugging parameters.
 * @method module:debug.set_debug_params
 * @param {DebugParams} params Debug parameters
 * @cc_externs debug_view_mode wireframe_edge_color debug_colors_seed
 */
exports.set_debug_params = function(params) {
    var active_scene = m_scenes.get_active();
    var subs_debug_views = m_scenes.subs_array(active_scene, [m_subs.DEBUG_VIEW]);

    if (!subs_debug_views.length) {
        m_print.error("Debugging is not available on the scene.");
        return;
    }

    for (var i = 0; i < subs_debug_views.length; i++) {
        var subs_debug_view = subs_debug_views[i];
        if (typeof params.debug_view_mode == "number") {
            switch (params.debug_view_mode) {
            case m_debug.DV_NONE:
            case m_debug.DV_OPAQUE_WIREFRAME:
            case m_debug.DV_TRANSPARENT_WIREFRAME:
            case m_debug.DV_FRONT_BACK_VIEW:
            case m_debug.DV_BOUNDINGS:
            case m_debug.DV_CLUSTERS_VIEW:
            case m_debug.DV_BATCHES_VIEW:
            case m_debug.DV_RENDER_TIME:
                m_scenes.set_debug_view_mode(subs_debug_view, params.debug_view_mode);
                break;
            default:
                m_print.error("set_debug_params(): Wrong debug view mode");
                break;
            }
        }
        if (typeof params.debug_colors_seed == "number")
            m_scenes.set_debug_colors_seed(subs_debug_view, params.debug_colors_seed);
        if (typeof params.render_time_threshold == "number")
            m_scenes.set_render_time_threshold(subs_debug_view, params.render_time_threshold);
        if (typeof params.wireframe_edge_color == "object")
            m_scenes.set_wireframe_edge_color(subs_debug_view,
                    m_util.f32(params.wireframe_edge_color));
    }
}

exports.get_error_quantity = function() {
    return m_print.get_error_count();
}

exports.get_warning_quantity = function() {
    return m_print.get_warning_count();
}

exports.clear_errors_warnings = function() {
    return m_print.clear_errors_warnings();
}

/**
 * Print shaders' statistics.
 * @method module:debug.analyze_shaders
 * @param {string} [opt_shader_id_part=""] Shader ID (filename) part.
 */
exports.analyze_shaders = function(opt_shader_id_part) {

    var compiled_shaders = m_shaders.get_compiled_shaders();

    var count = 0;
    for (var shader_id in compiled_shaders) {
        if (opt_shader_id_part && shader_id.indexOf(opt_shader_id_part) === -1)
            continue;
        count++;
    }
    var msg = "of " + count + " analyzing...";

    var rslts = {};

    for (var shader_id in compiled_shaders) {

        if (opt_shader_id_part && shader_id.indexOf(opt_shader_id_part) === -1)
            continue;

        var cshader = compiled_shaders[shader_id];
        var stat = get_shaders_stat(cshader.vshader, cshader.fshader);
        if (!stat)
            continue;

        var shaders_info = cshader.shaders_info;
        var title = shaders_info.vert + " + " + shaders_info.frag;

        // NOTE: cshader.shaders_info
        stat.cshader = cshader;
        stat.shaders_info = shaders_info;

        var stats = rslts[title] = rslts[title] || [];

        stats.push(stat);
        m_print.log_raw(msg);
    }

    for (var title in rslts) {

        m_print.group("%c" + title, "color: #800");
        var stats = rslts[title];
        print_shader_stats(stats);
        m_print.groupEnd();
    }
}

/**
 * Return stage callback without loading data.
 * @method module:debug.fake_load
 * @param {StageloadCallback} stageload_cb Callback to report about the loading progress
 * @param {number} [interval=5000] Loading interval
 * @param {number} [start=0] Start percentage
 * @param {number} [end=5000] End percentage
 * @param {LoadedCallback} [loaded_cb=null] Callback to be executed right after load
 */
exports.fake_load = m_debug.fake_load;

function get_shaders_stat(vshader, fshader) {

    var ext_ds = m_ext.get_debug_shaders();
    if (!ext_ds) {
        m_print.warn("WEBGL_debug_shaders extension not found");
        return;
    }

    var vsrc_trans = ext_ds.getTranslatedShaderSource(vshader);
    var fsrc_trans = ext_ds.getTranslatedShaderSource(fshader);

    if (m_compat.detect_mobile()) {
        vsrc_trans = vsrc_trans.replace("#version", "#version 300 //")
        fsrc_trans = fsrc_trans.replace("#version", "#version 300 //")
        var vout = post_sync("/analyze_shader/vert_gles", vsrc_trans);
        var fout = post_sync("/analyze_shader/frag_gles", fsrc_trans);
    } else {
        // HACK: lower GLSL version for cgc tool
        vsrc_trans = vsrc_trans.replace("#version", "#version 400 //")
        fsrc_trans = fsrc_trans.replace("#version", "#version 400 //")
        var vout = post_sync("/analyze_shader/vert", vsrc_trans);
        var fout = post_sync("/analyze_shader/frag", fsrc_trans);
    }

    var vstats = parse_shader_assembly(vout);
    var fstats = parse_shader_assembly(fout);

    return {
        vsrc: m_debug.get_gl().getShaderSource(vshader),
        vsrc_trans: vsrc_trans,
        vout: vout,
        vstats: vstats,
        fsrc: m_debug.get_gl().getShaderSource(fshader),
        fsrc_trans: fsrc_trans,
        fout: fout,
        fstats: fstats
    };
}

function parse_shader_assembly(data) {
    var stats = {};

    if (!data)
        return stats;

    var lines = data.split("\n");

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];

        if (line.search(new RegExp(/^[A-Z.]+ ?/)) == -1) {
            continue;
        }

        var op = line.split(" ")[0];

        if (!(op in stats))
            stats[op] = 0;

        stats[op]++;
    }

    var all_ops = 0;
    var tex_ops = 0;
    var attribs = 0;

    for (var op in stats) {
        switch (op) {
        case "KIL":
        case "TEX":
        case "TXB":
        case "TXP":
        case "KIL.F":
        case "TEX.F":
        case "TXB.F":
        case "TXD.F":
        case "TXL.F":
        case "TXQ.F":
        case "TXP.F":
            tex_ops += stats[op];
            all_ops += stats[op];
            break;
        // data type qualifiers
        case "ATTRIB":
            attribs += stats[op];
            break;
        case "ADDRESS":
        case "PARAM":
        case "TEMP":
        case "ALIAS":
        case "OUTPUT":
            break;
        // end program line
        case "END":
            break;
        default:
            all_ops += stats[op];
            break;
        }
    }

    stats["ALL_OPS"] = all_ops;
    stats["TEX_OPS"] = tex_ops;
    stats["ATTRIBS"] = attribs;

    return stats;
}

function post_sync(path, data) {
    var req = new XMLHttpRequest();
    req.open("POST", path, false);
    req.send(data);

    if (req.status == 200)
        return req.responseText;
    else {
        m_print.error(req.responseText);
        throw("Error POST XHR: " + req.status);
    }
}

function print_shader_stats(stats) {
    // sort in descending order by fragment shader operations
    stats.sort(function(a, b) {
        return b.fstats["ALL_OPS"] - a.fstats["ALL_OPS"];
    })

    for (var j = 0; j < stats.length; j++) {
        var stat = stats[j];

        var fstats = stat.fstats;
        var vstats = stat.vstats;

        var mat_names = find_material_names_by_comp_shader(stat.cshader);
        mat_names = mat_names.length ? "\t\t(" + mat_names.join(", ") + ")" : "\t\t(NA)";

        // NOTE some not changing params are commented out
        m_print.groupCollapsed(
            "VERT ->",
            "OPS", vstats["ALL_OPS"],
            "ATT", vstats["ATTRIBS"],
            "TEX", vstats["TEX_OPS"],

            "\t\tFRAG ->",
            "OPS", fstats["ALL_OPS"],
            "TEX", fstats["TEX_OPS"],
            mat_names
        );

        m_print.groupCollapsed("directives");
        // NOTE: perhaps they should be stored in sorted order
        var dirs = stat.shaders_info.directives.slice().sort();
        for (var i = 0; i < dirs.length; i++) {
            var dir = dirs[i];
            m_print.log_raw(dir[0], dir[1]);
        }
        m_print.groupEnd();

        m_print.groupCollapsed("node elements");
        var nelem = stat.shaders_info.node_elements;
        for (var i = 0; i < nelem.length; i++)
            m_print.log_raw(nelem[i]);
        m_print.groupEnd();

        m_print.groupCollapsed("vert source");
        m_print.log_raw(stat.vsrc);
        m_print.groupEnd();

        m_print.groupCollapsed("vert translated source");
        m_print.log_raw(stat.vsrc_trans);
        m_print.groupEnd();

        // ignore them as they used for collective stats
        var ignored_stats = ["ALL_OPS", "TEX_OPS", "ATTRIBS"];

        m_print.groupCollapsed("vert ops stats");
        for (var op in vstats)
            if (ignored_stats.indexOf(op) == -1)
                m_print.log_raw(op, vstats[op]);
        m_print.groupEnd();

        m_print.groupCollapsed("vert assembly");
        m_print.log_raw(stat.vout);
        m_print.groupEnd();

        m_print.groupCollapsed("frag source");
        m_print.log_raw(stat.fsrc);
        m_print.groupEnd();

        m_print.groupCollapsed("frag translated source");
        m_print.log_raw(stat.fsrc_trans);
        m_print.groupEnd();

        m_print.groupCollapsed("frag ops stats");
        for (var op in fstats)
            if (ignored_stats.indexOf(op) == -1)
                m_print.log_raw(op, fstats[op]);
        m_print.groupEnd();

        m_print.groupCollapsed("frag assembly");
        m_print.log_raw(stat.fout);
        m_print.groupEnd();

        m_print.groupEnd();
    }
}

function find_material_names_by_comp_shader(cshader) {

    var names = [];

    var scenes = m_scenes.get_all_scenes();

    for (var i = 0; i < scenes.length; i++) {
        var scene = scenes[i];
        var objects = m_obj.get_scene_objs(scene, "MESH", m_obj.DATA_ID_ALL);

        for (var j = 0; j < objects.length; j++) {
            var obj = objects[j];
            var scene_data = m_obj_util.get_scene_data(obj, scene);

            if (!scene_data || !scene_data.batches.length)
                continue;

            var batches = scene_data.batches;

            for (var k = 0; k < batches.length; k++) {
                var batch = batches[k];

                if (batch.shader == cshader)
                    for (var l = 0; l < batch.material_names.length; l++) {
                        var name = batch.material_names[l];
                        if (names.indexOf(name) == -1)
                            names.push(name);
                    }
            }
        }
    }

    return names;
}

/**
 * Perform simple performance test.
 * @method module:debug.test_performance
 * @param {TestPerformanceCallback} callback Callback
 */
exports.test_performance = function(callback) {
    // waiting for shaders
    if (!m_shaders.check_shaders_loaded()) {
        window.setTimeout(function() {
            exports.test_performance(callback);
        }, 100);
        return;
    }

    var ext = m_ext.get_disjoint_timer_query();
    if (!ext) {
        callback(0, 0);
        return;
    }

    var gl_debug_save = cfg_def.gl_debug;
    // enable it to force timer queries update for
    // paused engine / unloaded scenes
    cfg_def.gl_debug = true;

    var graph = m_scgraph.create_performance_graph();
    m_scenes.generate_auxiliary_batches(null, graph);

    var subs = m_scgraph.find_subs(graph, m_subs.PERFORMANCE);
    var cam = subs.camera;

    for (var i = 0; i < PERF_NUM_CALLS; i++)
        m_render.draw(subs);

    cfg_def.gl_debug = gl_debug_save;

    window.setTimeout(function() {
        m_debug.process_timer_queries(subs);
        // in ms
        var time = subs.debug_render_time;
        // in GB/s (100 texture lookups)
        var bandwidth = (cam.width * cam.height * 4 * 10) /
                (time / 1000) / Math.pow(10, 9);
        callback(time, bandwidth);
    }, 100);
}

exports.calc_vbo_garbage_byte_size = m_debug.calc_vbo_garbage_byte_size;

exports.show_vbo_garbage_info = m_debug.show_vbo_garbage_info;

exports.print_batches_stat = m_debug.print_batches_stat;

function call(func, name) {
    var decor_func = function() {
        _called_funcs.push(decor_func);
        return func.apply(func, arguments);

    }
    return decor_func;
}

exports.start_debug = function(module_name) {
    _called_funcs = [];
    _test_result = true;
    var module = require(module_name);
    for (var name in module)
        if (typeof module[name] === "function")
            module[name] = call(module[name], name);
}

exports.check_debug_result = function() {
    return _test_result;
}

/**
 * Test code.
 * @method module:debug.test
 * @param {string} test_name Test name
 * @param {CodeTestCallback} callback Callback
 */
exports.test = function(test_name, callback) {

    var m_print = require("__print");
    var print_err_func = m_print.error;
    var print_err_once_func = m_print.error_once;
    var print_warn_func = m_print.warn;

    m_print.error = m_print.error_once = function error() {
        var args = m_print.compose_args_prefix(arguments, "B4W ERROR");
        _last_err_message = args.join(" ");
        _err_got = true;
    }

    m_print.warn = function warn() {
        var args = m_print.compose_args_prefix(arguments, "B4W WARN");
        _last_warn_message = args.join(" ");
        _warn_got = true;
    }

    _warn_got = false;
    _err_got = false;

    try {
        callback();
        var success = true;
    } catch(e) {
        _test_result = false;
        console.error("Test \"" + test_name + "\" failed with exception: \"" + e + "\"");
        var success = false;
        _warn_got = false;
        _err_got = false;
    }

    m_print.error = print_err_func;
    m_print.error_once = print_err_once_func;
    m_print.warn = print_warn_func;

    return success;
}

/**
 * Compare color picked at the center of the screen with reference RGBA vector.
 * @param {RGBA} ref_color Reference RGBA vector to compare with.
 */
exports.pix = function(ref_color) {
    var canvas_w = m_cont.get_viewport_width();
    var canvas_h = m_cont.get_viewport_height();

    var canvas_x = canvas_w / 2;
    var canvas_y = canvas_h / 2;

    m_cont.resize(canvas_w, canvas_h, false);

    var scene = m_scenes.get_active();
    var graph = scene._render.graph;
    var subs = m_scgraph.find_on_screen(graph);
    if (!subs)
        m_util.panic("Couldn't find onscreen subscene");

    var cam = subs.camera;
    var viewport_xy = m_cont.canvas_to_viewport_coords(canvas_x, canvas_y,
            _vec2_tmp, subs.camera);

    viewport_xy[1] = cam.height - viewport_xy[1];
    var color = m_render.read_pixels(cam.framebuffer, viewport_xy[0],
            viewport_xy[1], 1, 1, _pixel);

    eqv(ref_color, color, 1);
}

exports.eqs = function(result, exp_result, expected_err, expected_warn) {
    if (JSON.stringify(result) != JSON.stringify(exp_result))
        throw "debug.eqs: wrong result";

    check_err_warn_messages(expected_err, expected_warn, "eqs");
}

exports.eqv = eqv;
function eqv(result, exp_result, eps, expected_err, expected_warn) {
    if (typeof exp_result != typeof result)
        throw "debug.eqv: wrong expected data type";
    if (result.length != exp_result.length)
        throw "debug.eqv: wrong expected vector length";
    eps = eps ? eps : EPS;
    for (var i = 0; i < result.length; i++) {
        // NaN values are not allowed
        if (typeof exp_result[i] != "number" || isNaN(exp_result[i]))
            throw "debug.eqv: wrong expected data type";
        if (typeof result[i] != "number" || isNaN(result[i]))
            throw "debug.eqv: wrong result data type";
        if (exp_result[i] > result[i] + eps || exp_result[i] < result[i] - eps)
            throw "debug.eqv: wrong result";
    }

    check_err_warn_messages(expected_err, expected_warn, "eqv");
}

exports.eqf = function(result, exp_result, eps, expected_err, expected_warn) {
    // NaN values are not allowed
    if (typeof exp_result != "number" || isNaN(exp_result))
        throw "debug.eqf: wrong expected data type";
    if (typeof result != "number" || isNaN(result))
        throw "debug.eqf: wrong result data type";
    eps = eps ? eps : EPS;
    if (exp_result > result + eps || exp_result < result - eps)
        throw "debug.eqf: wrong result";

    check_err_warn_messages(expected_err, expected_warn, "eqf");
}

exports.eq = function(result, exp_result, expected_err, expected_warn) {
    if (result !== exp_result)
        throw "debug.eq: wrong result";

    check_err_warn_messages(expected_err, expected_warn, "eq");
}

exports.ok = function(exp, expected_err, expected_warn) {

    if (!Boolean(exp))
        throw "debug.ok: wrong result";

    check_err_warn_messages(expected_err, expected_warn, "ok");
}

function check_err_warn_messages(expected_err, expected_warn, func_name) {
    expected_err = expected_err || "";
    expected_warn = expected_warn || "";

    if (_err_got) {
        if (expected_err == "")
            throw "debug." + func_name + ": no error is expected, but got \"" 
                    + _last_err_message + "\"";
        else if (_last_err_message != expected_err)
            throw "debug." + func_name + ": error \"" + expected_err 
                    + "\" is expected, but got \"" + _last_err_message + "\"";
    } else {
        if (expected_err != "")
            throw "debug." + func_name + ": error \"" + expected_err 
                + "\" is expected, but got nothing";
    }
    if (_warn_got) {
        if (expected_warn == "")
            throw "debug." + func_name + ": no warning is expected, but got \"" 
                    + _last_warn_message + "\"";
        else if (_last_warn_message != expected_warn)
            throw "debug." + func_name + ": warning \"" + expected_warn 
                    + "\" is expected, but got \"" + _last_warn_message + "\"";
    } else {
        if (expected_warn != "")
            throw "debug." + func_name + ": warning \"" + expected_warn 
                + "\" is expected, but got nothing";
    }

    _warn_got = false;
    _err_got = false;
}

exports.stat = function(module_name) {
    var missing_functions = [];

    var module = require(module_name);
    for (var name in module)
        if (_called_funcs.indexOf(module[name]) == -1 &&
                typeof module[name] === "function")
            missing_functions.push(name);

    if (missing_functions.length) {
        m_print.groupCollapsed(missing_functions.length + " function(s) not tested.");
        for (var i = 0; i < missing_functions.length; i++)
            m_print.log_raw(missing_functions[i]);
        m_print.groupEnd();
    } else
        m_print.group("All functions were tested.");
}

/**
 * Show normals of the dynamic object.
 * @method module:debug.show_normals
 * @param {Object3D} obj Object 3D
 * @param {string} mat_name Material name
 * @param {number} length Length of normals
 * @param {number} width Width of normals
 */
exports.show_normals = function(obj, mat_name, length, width) {
    hide_normals();

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!m_geom.has_dyn_geom(obj) || !batch) {
        m_print.error("Normals are not avaliable for the dynamic object:", obj.name);
        return false;
    }

    var bufs_data = batch.bufs_data;
    if (!(bufs_data && bufs_data.pointers &&
            bufs_data.pointers["a_position"] &&
            bufs_data.pointers["a_tbn"])) {
        m_print.error("Normals are not avaliable for the object:", obj.name);
        return false;
    }

    var positions = m_geom.extract_array_float(bufs_data, "a_position");
    var norms = m_geom.extract_array_float(bufs_data, "a_normal");

    var obj_tsr = m_trans.get_tsr(obj, _tsr_tmp);

    _normal_line = m_obj.create_line("normal_line");

    var normals = new Float32Array(2 * positions.length);
    for (var i = 0; i < positions.length; i += 3) {
        var ver_pos = _vec3_tmp;
        ver_pos[0] = positions[i + 0];
        ver_pos[1] = positions[i + 1];
        ver_pos[2] = positions[i + 2];
        var begin_norm = m_tsr.transform_vec3(ver_pos, obj_tsr, _vec3_tmp2);
        normals[2 * i + 0] = begin_norm[0];
        normals[2 * i + 1] = begin_norm[1];
        normals[2 * i + 2] = begin_norm[2];

        var dir = m_vec3.scale(norms.subarray(i, i + 3), length, _vec3_tmp2);
        var end_norm_l = m_vec3.add(ver_pos, dir, _vec3_tmp2);
        var end_norm = m_tsr.transform_vec3(end_norm_l, obj_tsr, _vec3_tmp2);
        normals[2 * i + 3] = end_norm[0];
        normals[2 * i + 4] = end_norm[1];
        normals[2 * i + 5] = end_norm[2];
    }

    var normal_line_batch = m_batch.get_first_batch(_normal_line);

    m_geom.draw_line(normal_line_batch, normals, true);
    m_render.assign_attribute_setters(normal_line_batch);
    normal_line_batch.diffuse_color.set([1.0, 1.0, 1.0, 1.0]);
    normal_line_batch.line_width = width;
}

/**
 * Hide normals of a dynamic object.
 * @method module:debug.hide_normals
 */
exports.hide_normals = hide_normals;
function hide_normals() {
    if (!_normal_line)
        return;

    // NOTE: it is a copy/paste m_scenes.remove_object
    m_obj.obj_switch_cleanup_flags(_normal_line, false, false, false);
    m_data.prepare_object_unloading(_normal_line);
    m_obj.obj_switch_cleanup_flags(_normal_line, true, true, true);
    m_obj.remove_object(_normal_line);

    _normal_line = null;
}

}
