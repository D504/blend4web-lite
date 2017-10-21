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
 * HMD configurator add-on.
 * @module hmd_conf
 */
b4w.module["hmd_conf"] = function(exports, require) {

var m_cont      = require("container");
var m_ctl       = require("controls");
var m_input     = require("input");
var m_print     = require("print");
var m_storage   = require("storage");
var m_util      = require("util");

var _is_shown = false;
var _hmd_dialog = null;
var _style = null;
var _hmd_list = null;
var _update = true;
var _param_values = {
    "profile": "custom",
    "first_distortion": 0,
    "second_distortion": 0,
    "bevel_size": 0,
    "screen_width": 0,
    "screen_height": 0,
    "screen_lense": 0,
    "ipd": 0,
    "baseline": 0
};

var DEFAULT_FIRST_DISTORTION = 0.34;
var DEFAULT_SECOND_DISTORTION = 0.55;
var DEFAULT_BEVEL_SIZE = 4;
var DEFAULT_SCREEN_WIDTH = 110;
var DEFAULT_SCREEN_HEIGHT = 65;
var DEFAULT_SCREEN_LENSE_DIST = 50;
var DEFAULT_EYE_DISTANCE = 64;
var DEFAULT_BASELINE_DIST = 32;

var INCH_TO_MM = 25.4;

var IS_IOS = /iPad|iPhone|iPod/.test(navigator.platform);
var UPDATE_DELAY = 1000;
var MM_TO_M = 1 / 1000;

var P_COMMON = 0;
var P_MOBILE = 1;
var P_WEBVR = 2;
// use braces to prevent a obfuscation
var _viewer_profiles = {
    "oculus_dk2": {
        name: "Oculus Rift DK2",
        type: P_WEBVR,
        "first_distortion": 0.22,
        "second_distortion": 0.28
        // don't forget to place comma if you uncomment the next line
        // chromatic_aberration_coefs: [-0.015, 0.02, 0.025, 0.02]
    },
    "cardboard_1": {
        name: "Cardboard (2014)",
        type: P_MOBILE,
        "ipd": 60,
        "baseline": 35,
        "screen_lense": 42,
        "first_distortion": 0.441,
        "second_distortion": 0.156
        // don't forget to place comma if you uncomment the next line
        // chromatic_aberration_coefs : [0.0, 0.0, 0.0, 0.0]
    },
    "cardboard_2": {
        name: "Cardboard (2015)",
        type: P_MOBILE,
        "ipd": 64,
        "baseline": 35,
        "screen_lense": 39,
        "first_distortion": 0.34,
        "second_distortion": 0.55
        // don't forget to place comma if you uncomment the next line
        // chromatic_aberration_coefs : [0.0, 0.0, 0.0, 0.0]
    },
    "custom": {
        name: "Custom",
        type: P_COMMON,
        "ipd": 64,
        "baseline": 35,
        "screen_lense": 39,
        "first_distortion": 0.0,
        "second_distortion": 0.0
        // don't forget to place comma if you uncomment the next line
        // chromatic_aberration_coefs: [0.0, 0.0, 0.0, 0.0]
    }
}

var _param_list = [{
        label: "Tray to lens-center distance.",
        is_mobile: true,
        inputs: [{
                id: "baseline",
                max: "50",
                step: "0.5"
            }
        ]
    }, {
        label: "Interpupillary distance.",
        is_mobile: true,
        inputs: [{
                id: "ipd",
                max: "100",
                step: "1"
            }
        ]
    }, {
        label: "Screen to lense distance.",
        is_mobile: true,
        inputs: [{
                id: "screen_lense",
                max: "100",
                step: "1"
            }
        ]
    }, {
        label: "Screen height.",
        is_mobile: true,
        inputs: [{
                id: "screen_height",
                max: "150",
                step: "1"
            }
        ]
    }, {
        label: "Screen width.",
        is_mobile: true,
        inputs: [{
                id: "screen_width",
                max: "200",
                step: "1"
            }
        ]
    }, {
        label: "Bevel width.",
        is_mobile: true,
        inputs: [{
                id: "bevel_size",
                max: "20",
                step: "1"
            }
        ]
    }, {
        label: "Distortion coefficients.",
        inputs: [{
                id: "first_distortion",
                max: "1.0",
                step: "0.01"
            }, {
                id: "second_distortion",
                max: "1.0",
                step: "0.01"
            }
        ]
    }
]

/**
 * Check if HMD configurator can be shown.
 * @method module:hmd_conf.check
 * @returns {boolean} The result of the checking.
 */
exports.check = check;
function check() {
    if (!m_input.can_use_device(m_input.DEVICE_HMD))
        return false;

    var device = m_input.get_device_by_type_element(m_input.DEVICE_HMD);
    var hmd_type = m_input.get_value_param(device, m_input.HMD_WEBVR_TYPE);
    return (hmd_type & (m_input.HMD_NON_WEBVR | m_input.HMD_WEBVR_MOBILE |
            m_input.HMD_WEBVR_DESKTOP)) &&
            !(hmd_type & m_input.HMD_WEBVR1);
}

/**
 * Show HMD configurator.
 * @method module:hmd_conf.show
 * @param {string} css_class CSS class of HMD configurator element
 */
exports.show = function(css_class) {
    if (!check())
        return;

    var container = m_cont.get_container();

    _style = document.createElement("style");
    _style.innerHTML = "." + css_class + " input[type=range]::-webkit-slider-runnable-track {width: 100%; height: 8px;cursor: pointer;background-color: #fff;border: 2px solid rgba(98, 98, 98, .2);box-shadow: 0px 0px 4px 0px rgba(98, 98, 98, .8);}." + css_class + " input[type=range]::-webkit-slider-thumb {box-shadow: 0px 0px 4px 0px rgba(98, 98, 98, .8);height: 30px;width: 16px;border-radius: 2px;background-color: #323232;cursor: pointer;margin-top: -13px;-webkit-appearance: none;}";

    document.head.appendChild(_style);

    if (_is_shown)
        return;
    _is_shown = true;
    restore_params();

    var mdevice = m_input.get_device_by_type_element(m_input.DEVICE_MOUSE, container);
    m_input.switch_prevent_default(mdevice, false);
    var tdevice = m_input.get_device_by_type_element(m_input.DEVICE_TOUCH, container);
    m_input.switch_prevent_default(tdevice, false);

    _hmd_dialog = document.createElement("div");
    _hmd_dialog.className = css_class;
    container.appendChild(_hmd_dialog);
    _hmd_list = document.createElement("div");
    _hmd_dialog.appendChild(_hmd_list)

    _hmd_list.style.cssText =
          "background-color: #484848;" +
          "border: 2px solid rgba(150, 150, 150, 0.7);" +
          "box-shadow: 0px 0px 10px 0px rgba(150, 150, 150, 0.7);" +
          "position: relative;" +
          "width: 524px;" +
          "padding: 16px;" +
          "overflow: hidden;";

    var select = create_profiles_select();
    _hmd_list.appendChild(select);

    var device = m_input.get_device_by_type_element(m_input.DEVICE_HMD);
    for (var i = 0; i < _param_list.length; i++) {
        if (m_input.get_value_param(device, m_input.HMD_WEBVR_TYPE) &
                (m_input.HMD_NON_WEBVR | m_input.HMD_WEBVR_MOBILE) ||
                !_param_list[i].is_mobile) {
            var param_cont = create_param(_param_list[i], i);
            _hmd_list.appendChild(param_cont);
        }
    }

    var buttons = create_buttons();
    _hmd_list.appendChild(buttons);

    var time = m_ctl.create_timeline_sensor();
    var last_update_time = 0;
    function update_cb(obj, id, pulse) {
        var time = m_ctl.get_sensor_value(obj, id, 0);
        if (time - last_update_time > UPDATE_DELAY) {
            last_update_time = time;
            update_params();
        }
    }
    m_ctl.create_sensor_manifold(null, "UPDATE_HMD_RENDERING",
            m_ctl.CT_CONTINUOUS, [time], null, update_params);
}

function create_profiles_select() {
    var hmd_conf_str = m_storage.get("hmd_conf", "b4w");
    var hmd_conf_data = JSON.parse(hmd_conf_str? hmd_conf_str: "{}");
    var cur_profile = hmd_conf_data["profile"] || "custom";

    var select_cont = document.createElement("div");

    var label = document.createElement("label");
    label.innerHTML = "Profile: ";
    label.className = "text_label";

    label.style.cssText =
        "background-color: #323232;" +
        "border: 2px solid rgba(98, 98, 98, .2);" +
        "border-radius: 2px;" +
        "width: 120px;" +
        "height: 30px;" +
        "display: block;" +
        "float: left;" +
        "font-size: 16px;" +
        "font-weight: normal;" +
        "color: #fff;" +
        "cursor: pointer;" +
        "text-decoration: none;" +
        "text-align: left;" +
        "padding-left: 8px;" +
        "line-height: 28px;" +
        "margin-bottom: 4px;" +
        "box-shadow: 0px 0px 4px 0px rgba(98, 98, 98, .8);";

    select_cont.appendChild(label);

    var select = document.createElement("select");
    select_cont.appendChild(select);

    select.style.cssText =
        "background-color: #323232;" +
        "border: 2px solid rgba(98, 98, 98, .2);" +
        "border-radius: 2px;" +
        "height: 30px;" +
        "display: block;" +
        "font-size: 16px;" +
        "font-weight: normal;" +
        "color: #fff;" +
        "cursor: pointer;" +
        "text-decoration: none;" +
        "text-align: left;" +
        "padding-left: 8px;" +
        "line-height: 28px;" +
        "margin-bottom: 4px;" +
        "box-shadow: 0px 0px 4px 0px rgba(98, 98, 98, .8);";

    var device = m_input.get_device_by_type_element(m_input.DEVICE_HMD);
    if (device)
        for (var i in _viewer_profiles) {
            if (_viewer_profiles[i].type == P_COMMON ||
                    (m_input.get_value_param(device, m_input.HMD_WEBVR_TYPE) &
                    (m_input.HMD_NON_WEBVR | m_input.HMD_WEBVR_MOBILE) &&
                    _viewer_profiles[i].type == P_MOBILE)) {
                var option = document.createElement("option");
                option.value = i;
                option.text = _viewer_profiles[i].name;
                select.appendChild(option);
            }
        }

    select.value = cur_profile;
    if (m_util.is_ie11())
        select.onchange = change_select_cb;
    else
        select.oninput = change_select_cb;
    return select_cont;
}

function change_select_cb(e){
    var profile = e.target.value;
    var profile_data = _viewer_profiles[profile];

    for (var name in _param_values) {
        if (name in profile_data) {
            var slider = document.getElementById(name + "_slider");
            if (slider) {
                slider.disabled = profile !== "custom";
                slider.value = profile_data[name];
            }

            var number = document.getElementById(name + "_number");
            if (number) {
                number.disabled = profile !== "custom";
                number.value = profile_data[name];
            }

            _param_values[name] = profile_data[name];
        }
    }
}


/**
 * Hide HMD configurator.
 * @method module:hmd_conf.hide
 */
exports.hide = hide;
function hide() {
    m_ctl.remove_sensor_manifold(null, "UPDATE_HMD_RENDERING");
    restore_params();
    update_params();

    if (!_is_shown)
        return;
    _is_shown = false;
    remove_dom_tree();
}

/**
 * Reset values of HMD config.
 * @method module:hmd_conf.reset
 */
exports.reset = reset;
function reset() {
    restore_params(true);
    update_params();
    update_dom_tree();
}

/**
 * Update HMD device config without showing HMD configurator
 * @method module:hmd_conf.update
 */
exports.update = function() {
    restore_params();
    update_params();
}

function update_dom_tree() {
    for (var i in _param_values) {
        var slider = document.getElementById(i + "_slider");
        if (slider)
            slider.value = _param_values[i];
        var number = document.getElementById(i + "_number");
        if (number)
            number.value = _param_values[i];
    }
}

function remove_dom_tree() {
    var container = m_cont.get_container();
    container.removeChild(_hmd_dialog);
    document.head.removeChild(_style);
    _hmd_dialog = null;
    _hmd_list = null;
    _style = null;
}

function get_screen_width() {
    return Math.max(window.screen.width, window.screen.height) *
            window.devicePixelRatio;
}

function get_screen_height() {
    return Math.min(window.screen.width, window.screen.height) *
            window.devicePixelRatio;
}

function check_rule(rule, ua, screenWidth, screenHeight) {
    return (rule["ua"] && ua.indexOf(rule["ua"]) >= 0) ||
            !rule["ua"] && rule["res"] && rule["res"][0] && rule["res"][1] &&
            Math.min(screenWidth, screenHeight) == Math.min(rule["res"][0], rule["res"][1]) &&
            Math.max(screenWidth, screenHeight) == Math.max(rule["res"][0], rule["res"][1]);
}

function find_device_index(dpdb, user_agent, width, height) {
    if (dpdb["format"] != 1 || !dpdb["devices"] || !dpdb["devices"].length) {
        m_print.error("DPDB isn't correct.");
        return -1;
    }

    for (var i = 0; i < dpdb["devices"].length; i++) {
        var device = dpdb["devices"][i];
        if (!device["rules"] ||
                (device["type"] != "ios" || !IS_IOS) && device["type"] != "android")
            continue;

        var found = false;
        for (var j = 0; j < device["rules"].length; j++) {
            var rule = device["rules"][j];
            if (check_rule(rule, user_agent, width, height)) {
                found = true;
                break;
            }
        }
        if (found)
            return i;
    }
    return -1;
}

function restore_params(ignore_storage) {
    var user_agent = navigator.userAgent || navigator.vendor || window.opera;
    var width = get_screen_width();
    var height = get_screen_height();
    var width_dpmm = 0;
    var height_dpmm = 0;
    var bevel_mm = 0;
    var device_index = find_device_index(DPDB, user_agent, width, height);
    if (device_index != -1) {
        var device = DPDB["devices"][device_index];
        var xdpi = device["dpi"][0] || device["dpi"];
        var ydpi = device["dpi"][1] || device["dpi"];

        width_dpmm = Math.round(width * INCH_TO_MM / xdpi);
        height_dpmm = Math.round(height * INCH_TO_MM / ydpi);
        bevel_mm = Math.round(device["bw"]);
    }

    var hmd_conf_str = m_storage.get("hmd_conf", "b4w");
    var hmd_conf_data = JSON.parse(hmd_conf_str? hmd_conf_str: "{}");

    if (ignore_storage) {
        _param_values["first_distortion"] = DEFAULT_FIRST_DISTORTION;
        _param_values["second_distortion"] = DEFAULT_SECOND_DISTORTION;
        _param_values["bevel_size"] = bevel_mm || DEFAULT_BEVEL_SIZE;
        _param_values["screen_width"] = width_dpmm || DEFAULT_SCREEN_WIDTH;
        _param_values["screen_height"] = height_dpmm || DEFAULT_SCREEN_HEIGHT;
        _param_values["screen_lense"] = DEFAULT_SCREEN_LENSE_DIST;
        _param_values["ipd"] = DEFAULT_EYE_DISTANCE;
        _param_values["baseline"] = DEFAULT_BASELINE_DIST;
    } else {
        _param_values["first_distortion"] = "first_distortion" in hmd_conf_data?
                parseFloat(hmd_conf_data["first_distortion"]):
                DEFAULT_FIRST_DISTORTION;
        _param_values["second_distortion"] = "second_distortion" in hmd_conf_data?
                parseFloat(hmd_conf_data["second_distortion"]):
                DEFAULT_SECOND_DISTORTION;
        _param_values["bevel_size"] = "bevel_size" in hmd_conf_data?
                parseFloat(hmd_conf_data["bevel_size"]):
                bevel_mm || DEFAULT_BEVEL_SIZE;
        _param_values["screen_width"] = "screen_width" in hmd_conf_data?
                parseFloat(hmd_conf_data["screen_width"]):
                width_dpmm || DEFAULT_SCREEN_WIDTH;
        _param_values["screen_height"] = "screen_height" in hmd_conf_data?
                parseFloat(hmd_conf_data["screen_height"]):
                height_dpmm || DEFAULT_SCREEN_HEIGHT;
        _param_values["screen_lense"] = "screen_lense" in hmd_conf_data?
                parseFloat(hmd_conf_data["screen_lense"]):
                DEFAULT_SCREEN_LENSE_DIST;
        _param_values["ipd"] = "ipd" in hmd_conf_data?
                parseFloat(hmd_conf_data["ipd"]): DEFAULT_EYE_DISTANCE;
        _param_values["baseline"] = "baseline" in hmd_conf_data?
                parseFloat(hmd_conf_data["baseline"]): DEFAULT_BASELINE_DIST;
    }

    _update = true;
}

function save_changes() {
    m_storage.set("hmd_conf", JSON.stringify(_param_values), "b4w");
    hide();
}

function update_params() {
    if (_update) {
        var device = m_input.get_device_by_type_element(m_input.DEVICE_HMD);
        if (device) {
            m_input.set_config(device, m_input.HMD_DISTORTION,
                    [_param_values["first_distortion"], _param_values["second_distortion"]]);

            if (m_input.get_value_param(device, m_input.HMD_WEBVR_TYPE) &
                    (m_input.HMD_NON_WEBVR | m_input.HMD_WEBVR_MOBILE)) {
                m_input.set_config(device, m_input.HMD_BEVEL_SIZE,
                        _param_values["bevel_size"] * MM_TO_M);
                m_input.set_config(device, m_input.HMD_SCREEN_WIDTH,
                        _param_values["screen_width"] * MM_TO_M);
                m_input.set_config(device, m_input.HMD_SCREEN_HEIGHT,
                        _param_values["screen_height"] * MM_TO_M);
                m_input.set_config(device, m_input.HMD_SCREEN_LENS_DIST,
                        _param_values["screen_lense"] * MM_TO_M);
                m_input.set_config(device, m_input.HMD_EYE_DISTANCE,
                        _param_values["ipd"] * MM_TO_M);
                m_input.set_config(device, m_input.HMD_BASELINE_DIST,
                        _param_values["baseline"] * MM_TO_M);
            }
        }
        _update = false;
    }

}

function change_slider_cb(e) {
    var id = e.target.id;
    var id_list = id.split("_");
    var value_id = id_list.splice(0, id_list.length - 1).join("_");
    if (value_id in _param_values && _param_values[value_id] != e.target.value) {
        _update = true;
        _param_values[value_id] = e.target.value;

        var slider = document.getElementById(value_id + "_slider");
        slider.value = e.target.value;

        var number = document.getElementById(value_id + "_number");
        number.value = e.target.value;
    }
}

function create_param(param, i) {
    var param_cont = document.createElement("div");

    var label_d = document.createElement("label");
    label_d.className = "text_label";

    var margin_right = "8px";

    if (i%2)
        margin_right = "0";

    label_d.style.cssText =
        "background-color: #323232;" +
        "border: 2px solid rgba(98, 98, 98, .2);" +
        "border-radius: 2px;" +
        "width: 100%;" +
        "height: 30px;" +
        "display: block;" +
        "font-size: 16px;" +
        "font-weight: normal;" +
        "color: #fff;" +
        "cursor: pointer;" +
        "text-decoration: none;" +
        "text-align: left;" +
        "padding-left: 8px;" +
        "line-height: 28px;" +
        "margin-bottom: 4px;" +
        "box-shadow: 0px 0px 4px 0px rgba(98, 98, 98, .8);";

    label_d.textContent = param.label;
    param_cont.appendChild(label_d);

    param_cont.style.cssText = 
        "margin-top: 16px;" +
        "float: left;" +
        "width: 240px;" +
        "margin-right: " + margin_right + ";" +
        "border-top: 2px solid rgba(98, 98, 98, .4);" +
        "box-sizing: border-box;" +
        "-webkit-box-sizing: border-box;" +
        "padding-top: 8px;";

    for (var j = 0; j < param.inputs.length; j++) {
        var input_data = param.inputs[j];
        var slider = create_slider(input_data);
        param_cont.appendChild(slider);
    }

    return param_cont;
}

function create_slider(input_data) {
    var container = document.createElement("div");
    container.className = "row";

    var input_s = document.createElement("input");
    input_s.className = "input_slider";

    input_s.style.cssText =
        "-webkit-appearance: none;" +
        "width: 192px;" +
        "display: block;" +
        "float: left;" +
        "height: 8px;" +
        "margin-bottom: 16px;" +
        "margin-top: 16px;" +
        "box-sizing: border-box;" +
        "margin-right: 8px;" +
        "margin-left: 0;";

    input_s.setAttribute("id", input_data.id + "_slider");
    input_s.setAttribute("type", "range");
    input_s.setAttribute("min", "0.00");
    input_s.setAttribute("step", input_data.step);
    input_s.setAttribute("value", _param_values[input_data.id]);
    input_s.setAttribute("max", input_data.max);

    container.appendChild(input_s);

    var input_d = document.createElement("input");
    input_d.className = "input_text";
    input_d.setAttribute("id", input_data.id + "_number");
    input_d.setAttribute("type", "number");
    input_d.setAttribute("min", "0.00");
    input_d.setAttribute("step", input_data.step);
    input_d.setAttribute("value", _param_values[input_data.id]);
    input_d.setAttribute("max", input_data.max);
    container.appendChild(input_d);
    input_d.style.cssText =
        "background-color: #323232;" +
        "border: 2px solid rgba(98, 98, 98, .2);" +
        "border-radius: 2px;" +
        "width: 40px;" +
        "height: 30px;" +
        "display: block;" +
        "float: left;" +
        "font-size: 16px;" +
        "font-weight: normal;" +
        "color: #fff;" +
        "cursor: pointer;" +
        "text-decoration: none;" +
        "text-align: center;" +
        "box-sizing: border-box;" +
        "line-height: 28px;" +
        "margin-top: 4px;" +
        "margin-right: 0;" +
        "margin-left: 0;" +
        "box-shadow: 0px 0px 4px 0px rgba(98, 98, 98, .8);";

    if (m_util.is_ie11()) {
        input_s.onchange = change_slider_cb;
        input_d.onchange = change_slider_cb;
    } else {
        input_s.oninput = change_slider_cb;
        input_d.oninput = change_slider_cb;
    }

    return container;
}

function create_buttons() {
    var buttons_container = document.createElement("div");
    var hmd_submit_button = create_button(save_changes, "SAVE", "4px");
    var hmd_cancel_button = create_button(hide, "CANCEL", "4px");
    var hmd_reset_button = create_button(reset, "RESET", "0px");

    buttons_container.className = "row";
    buttons_container.style.cssText =
        "padding-top: 32px;" +
        "clear: both;" +
        "box-sizing: border-box;" +
        "-webkit-box-sizing: border-box;";

    buttons_container.appendChild(hmd_submit_button);
    buttons_container.appendChild(hmd_cancel_button);
    buttons_container.appendChild(hmd_reset_button);

    // var common_style = "margin: 20px 0;" +
    //                    "border: 0;" +
    //                    "background-color: #337ab7;" +
    //                    "border-radius: 4px;" +
    //                    "margin-right:10px;" +
    //                    "color:#fff;" +
    //                    "padding: 10px 15px;" +
    //                    "margin-right: 5px;" +
    //                    "cursor:pointer;";

    // hmd_submit_button.style.cssText = common_style;
    // hmd_cancel_button.style.cssText = common_style;
    // hmd_reset_button.style.cssText = common_style;

    return buttons_container;
}

function create_button(callback, text_content, margin_right) {
    var button = document.createElement("button");
    button.onclick = callback;
    button.style.cssText =
        "background-color: #323232;" +
        "border: 2px solid rgba(98, 98, 98, .2);" +
        "border-radius: 2px;" +
        "width: 160px;" +
        "height: 30px;" +
        "display: block;" +
        "float: left;" +
        "font-size: 16px;" +
        "font-weight: normal;" +
        "color: #fff;" +
        "cursor: pointer;" +
        "text-decoration: none;" +
        "text-align: center;" +
        "padding-left: 8px;" +
        "line-height: 28px;" +
        "margin-right:" + margin_right + ";" +
        "box-shadow: 0px 0px 4px 0px rgba(98, 98, 98, .8);";

    button.innerHTML = text_content;
    return button;
}


/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var DPDB = {"_comment":"AUTOMATICALLY GENERATED BY generate_dpdb.py. DO NOT EDIT.","format":1,"last_updated":"2016-01-26T23:11:18Z","devices":[{"type":"android","rules":[{"mdmh":"asus/*/Nexus 7/*"},{"ua":"Nexus 7"}],"dpi":[320.8,323],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"asus/*/ASUS_Z00AD/*"},{"ua":"ASUS_Z00AD"}],"dpi":[403,404.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"HTC/*/HTC6435LVW/*"},{"ua":"HTC6435LVW"}],"dpi":[449.7,443.3],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"HTC/*/HTC One XL/*"},{"ua":"HTC One XL"}],"dpi":[315.3,314.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"htc/*/Nexus 9/*"},{"ua":"Nexus 9"}],"dpi":289,"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"HTC/*/HTC One M9/*"},{"ua":"HTC One M9"}],"dpi":[442.5,443.3],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"HTC/*/HTC One_M8/*"},{"ua":"HTC One_M8"}],"dpi":[449.7,447.4],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"HTC/*/HTC One/*"},{"ua":"HTC One"}],"dpi":472.8,"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Huawei/*/Nexus 6P/*"},{"ua":"Nexus 6P"}],"dpi":[515.1,518],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"LGE/*/Nexus 5X/*"},{"ua":"Nexus 5X"}],"dpi":[422,419.9],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"LGE/*/LGMS345/*"},{"ua":"LGMS345"}],"dpi":[221.7,219.1],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"LGE/*/LG-D800/*"},{"ua":"LG-D800"}],"dpi":[422,424.1],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"LGE/*/LG-D850/*"},{"ua":"LG-D850"}],"dpi":[537.9,541.9],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"LGE/*/VS985 4G/*"},{"ua":"VS985 4G"}],"dpi":[537.9,535.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"LGE/*/Nexus 5/*"},{"ua":"Nexus 5 B"}],"dpi":[442.4,444.8],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"LGE/*/Nexus 4/*"},{"ua":"Nexus 4"}],"dpi":[319.8,318.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"LGE/*/LG-P769/*"},{"ua":"LG-P769"}],"dpi":[240.6,247.5],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"LGE/*/LGMS323/*"},{"ua":"LGMS323"}],"dpi":[206.6,204.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"LGE/*/LGLS996/*"},{"ua":"LGLS996"}],"dpi":[403.4,401.5],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Micromax/*/4560MMX/*"},{"ua":"4560MMX"}],"dpi":[240,219.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Micromax/*/A250/*"},{"ua":"Micromax A250"}],"dpi":[480,446.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Micromax/*/Micromax AQ4501/*"},{"ua":"Micromax AQ4501"}],"dpi":240,"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"motorola/*/DROID RAZR/*"},{"ua":"DROID RAZR"}],"dpi":[368.1,256.7],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/XT830C/*"},{"ua":"XT830C"}],"dpi":[254,255.9],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/XT1021/*"},{"ua":"XT1021"}],"dpi":[254,256.7],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"motorola/*/XT1023/*"},{"ua":"XT1023"}],"dpi":[254,256.7],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"motorola/*/XT1028/*"},{"ua":"XT1028"}],"dpi":[326.6,327.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/XT1034/*"},{"ua":"XT1034"}],"dpi":[326.6,328.4],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"motorola/*/XT1053/*"},{"ua":"XT1053"}],"dpi":[315.3,316.1],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/XT1562/*"},{"ua":"XT1562"}],"dpi":[403.4,402.7],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/Nexus 6/*"},{"ua":"Nexus 6 B"}],"dpi":[494.3,489.7],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/XT1063/*"},{"ua":"XT1063"}],"dpi":[295,296.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"motorola/*/XT1064/*"},{"ua":"XT1064"}],"dpi":[295,295.6],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"motorola/*/XT1092/*"},{"ua":"XT1092"}],"dpi":[422,424.1],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"motorola/*/XT1095/*"},{"ua":"XT1095"}],"dpi":[422,423.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"OnePlus/*/A0001/*"},{"ua":"A0001"}],"dpi":[403.4,401],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"OnePlus/*/ONE E1005/*"},{"ua":"ONE E1005"}],"dpi":[442.4,441.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"OnePlus/*/ONE A2005/*"},{"ua":"ONE A2005"}],"dpi":[391.9,405.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"OPPO/*/X909/*"},{"ua":"X909"}],"dpi":[442.4,444.1],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/GT-I9082/*"},{"ua":"GT-I9082"}],"dpi":[184.7,185.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G360P/*"},{"ua":"SM-G360P"}],"dpi":[196.7,205.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/Nexus S/*"},{"ua":"Nexus S"}],"dpi":[234.5,229.8],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/GT-I9300/*"},{"ua":"GT-I9300"}],"dpi":[304.8,303.9],"bw":5,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SM-T230NU/*"},{"ua":"SM-T230NU"}],"dpi":216,"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SGH-T399/*"},{"ua":"SGH-T399"}],"dpi":[217.7,231.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-N9005/*"},{"ua":"SM-N9005"}],"dpi":[386.4,387],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SAMSUNG-SM-N900A/*"},{"ua":"SAMSUNG-SM-N900A"}],"dpi":[386.4,387.7],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/GT-I9500/*"},{"ua":"GT-I9500"}],"dpi":[442.5,443.3],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/GT-I9505/*"},{"ua":"GT-I9505"}],"dpi":439.4,"bw":4,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G900F/*"},{"ua":"SM-G900F"}],"dpi":[415.6,431.6],"bw":5,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G900M/*"},{"ua":"SM-G900M"}],"dpi":[415.6,431.6],"bw":5,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G800F/*"},{"ua":"SM-G800F"}],"dpi":326.8,"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G906S/*"},{"ua":"SM-G906S"}],"dpi":[562.7,572.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/GT-I9300/*"},{"ua":"GT-I9300"}],"dpi":[306.7,304.8],"bw":5,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-T535/*"},{"ua":"SM-T535"}],"dpi":[142.6,136.4],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SM-N920C/*"},{"ua":"SM-N920C"}],"dpi":[515.1,518.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/GT-I9300I/*"},{"ua":"GT-I9300I"}],"dpi":[304.8,305.8],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/GT-I9195/*"},{"ua":"GT-I9195"}],"dpi":[249.4,256.7],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SPH-L520/*"},{"ua":"SPH-L520"}],"dpi":[249.4,255.9],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SAMSUNG-SGH-I717/*"},{"ua":"SAMSUNG-SGH-I717"}],"dpi":285.8,"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SPH-D710/*"},{"ua":"SPH-D710"}],"dpi":[217.7,204.2],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/GT-N7100/*"},{"ua":"GT-N7100"}],"dpi":265.1,"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SCH-I605/*"},{"ua":"SCH-I605"}],"dpi":265.1,"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/Galaxy Nexus/*"},{"ua":"Galaxy Nexus"}],"dpi":[315.3,314.2],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-N910H/*"},{"ua":"SM-N910H"}],"dpi":[515.1,518],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-N910C/*"},{"ua":"SM-N910C"}],"dpi":[515.2,520.2],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G130M/*"},{"ua":"SM-G130M"}],"dpi":[165.9,164.8],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G928I/*"},{"ua":"SM-G928I"}],"dpi":[515.1,518.4],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G920F/*"},{"ua":"SM-G920F"}],"dpi":580.6,"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G920P/*"},{"ua":"SM-G920P"}],"dpi":[522.5,577],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G925F/*"},{"ua":"SM-G925F"}],"dpi":580.6,"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"samsung/*/SM-G925V/*"},{"ua":"SM-G925V"}],"dpi":[522.5,576.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Sony/*/C6903/*"},{"ua":"C6903"}],"dpi":[442.5,443.3],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"Sony/*/D6653/*"},{"ua":"D6653"}],"dpi":[428.6,427.6],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Sony/*/E6653/*"},{"ua":"E6653"}],"dpi":[428.6,425.7],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Sony/*/E6853/*"},{"ua":"E6853"}],"dpi":[403.4,401.9],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"Sony/*/SGP321/*"},{"ua":"SGP321"}],"dpi":[224.7,224.1],"bw":3,"ac":500},{"type":"android","rules":[{"mdmh":"TCT/*/ALCATEL ONE TOUCH Fierce/*"},{"ua":"ALCATEL ONE TOUCH Fierce"}],"dpi":[240,247.5],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"THL/*/thl 5000/*"},{"ua":"thl 5000"}],"dpi":[480,443.3],"bw":3,"ac":1000},{"type":"android","rules":[{"mdmh":"ZTE/*/ZTE Blade L2/*"},{"ua":"ZTE Blade L2"}],"dpi":240,"bw":3,"ac":500},{"type":"ios","rules":[{"res":[640,960]}],"dpi":[325.1,328.4],"bw":4,"ac":1000},{"type":"ios","rules":[{"res":[640,1136]}],"dpi":[317.1,320.2],"bw":3,"ac":1000},{"type":"ios","rules":[{"res":[750,1334]}],"dpi":326.4,"bw":4,"ac":1000},{"type":"ios","rules":[{"res":[1242,2208]}],"dpi":[453.6,458.4],"bw":4,"ac":1000},{"type":"ios","rules":[{"res":[1125,2001]}],"dpi":[410.9,415.4],"bw":4,"ac":1000}]}

};
