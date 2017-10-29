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

import register from "../util/register";

import m_screen_fact from "../ext/screen";
import m_print_fact from "../print";

/**
 * Screen shooter add-on.
 * @module screenshooter
 */
function Screenshooter(ns, exports) {

var m_screen = m_screen_fact(ns);
var m_print  = m_print_fact(ns);

/**
 * Take a screenshot and download as screenshot.png image.
 * @method module:screenshooter.shot
 * @param {string} [format="image/png"] The MIME image format ("image/png",
 * "image/jpeg", "image/webp" and so on)
 * @param {number} [quality=1.0] Number between 0 and 1 for types: "image/jpeg",
 * "image/webp"
 * @example
 * var m_scrn = require("screenshooter");
 * m_scrn.shot();
 * @deprecated Use {@link module:screen.shot} instead
 */
exports.shot = function(format, quality) {
    m_print.error_deprecated("shot", "screen.shot");
    m_screen.shot(format, quality);
}

};

var screenshooter_factory = register("screenshooter", Screenshooter);

export default screenshooter_factory;