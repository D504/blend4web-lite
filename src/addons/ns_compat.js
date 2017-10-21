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

if (!window["b4w"])
    throw "Failed to register module ns_compat, load b4w first";

/**
 * Namespace compatibility add-on. Enables access to engine modules by
 * <code>b4w.MODULE</code>. Provides no external methods.
 * @module ns_compat
 */
b4w.module["ns_compat"] = function(exports, require) {

for (var mod_id in b4w.module)
    b4w[mod_id] = b4w.require(mod_id);
}

b4w.require("ns_compat");

