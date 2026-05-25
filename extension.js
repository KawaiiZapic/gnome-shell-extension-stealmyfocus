/*
    This file is part of Steal My Focus Window

    Steal My Focus Window is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Steal My Focus Window is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Steal My Focus Window.  If not, see <http://www.gnu.org/licenses/>.

    SPDX-FileCopyrightText: Valentin Dimitrov <valio86@gmail.com>
    SPDX-License-Identifier: GPL-3.0-or-later
*/

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class FocusMyWindow extends Extension {
    enable() {
        this._handlerid = global.display.connect('window-demands-attention', function (display, window) {
            Main.activateWindow(window);
        });
    }

    disable() {
        global.display.disconnect(this._handlerid);
        this._handlerid = null;
    }
}
