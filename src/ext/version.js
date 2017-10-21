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
 * Version API. Allows to query various information about the current release.
 * @module version
 */
b4w.module["version"] = function(exports, require) {

var m_version = require("__version");

/**
 * Get the version.
 * The version is an array of the format: [yy, mm] or [yy, mm, bugfix] for "RELEASE"
 * version or [yy, mm] for "DEBUG" version.
 * @method module:version.version
 * @returns {Array} Version: [yy, mm]
 */
exports.version = m_version.version;

/**
 * Get the version.
 * The version string has the format: "yy.mm" or "yy.mm.bugfix" for "RELEASE"
 * version or "yy.mm" for "DEBUG" version.
 * @method module:version.version_str
 * @returns {string} Version string
 */
exports.version_str = m_version.version_str;

/**
 * Get the release type: "DEBUG" or "RELEASE".
 * @method module:version.type
 * @returns {string} Release type
 */
exports.type = m_version.type;

/**
 * Return the build date or the current date for the "DEBUG" version.
 * @method module:version.date
 * @returns {Date} Date
 */
exports.date = m_version.date;

/**
 * Return the build date or the current date for the "DEBUG" version.
 * @method module:version.date_str
 * @returns {string} Date string in the format: "dd.mm.yyyy hh.mm.ss"
 */
exports.date_str = m_version.date_str;

/**
 * Returns a string representing the application version based on build time. 
 * Returns the current timestamp in the "DEBUG" mode.
 * @method module:version.get_build_version
 * @returns {string} Build version.
 */
exports.get_build_version = m_version.get_build_version;

}
