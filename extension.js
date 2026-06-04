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

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { Inspector } from 'resource:///org/gnome/shell/ui/lookingGlass.js';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';

export default class FocusMyWindow extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._picker = new WindowPicker();
        this._picker.export();
        this._handlerid = global.display.connect('window-demands-attention',
            (display, window) => this._onWindowDemandsAttention(window));
    }

    _onWindowDemandsAttention(window) {
        const wmClass = window.wm_class?.toLowerCase() ?? '';
        const whitelistEnabled = this._settings.get_boolean('whitelist-mode');
        const windowList = this._settings.get_strv('window-list');

        const isListed = windowList.some(pattern =>
            wmClass.toLowerCase() === pattern.toLowerCase()
        );

        // if whitelist enabled && listed 
        // or whitelist disabled && not listed
        if (whitelistEnabled === isListed) {
            Main.activateWindow(window);
        }
    }

    disable() {
        global.display.disconnect(this._handlerid);
        this._picker.unexport();
        this._handlerid = null;
        this._settings = null;
        this._picker = null;
    }
}

const DBusInterfaceScheme = `
<node>
  <interface name="org.gnome.Shell.Extensions.StealMyFocus">
    <method name="pick" />
    <signal name="picked">
      <arg name="window" type="s" />
    </signal>
  </interface>
</node>
`;

const NotFoundWindowString = "!!no-window-picked!!";
const objectPath = '/org/gnome/shell/extensions/StealMyFocus';

export class WindowPicker {
    #dbus = Gio.DBusExportedObject.wrapJSObject(DBusInterfaceScheme, this);

    #sendPickedWindow(wmClass) {
        this.#dbus.emit_signal('picked', new GLib.Variant('(s)', [wmClass]));
    }

    pick() {
        const lookingGlass = Main.createLookingGlass();
        const inspector = new Inspector(lookingGlass);

        inspector.connect('target', (me, target, x, y) => {
            const effectName = 'lookingGlass_RedBorderEffect';
            for (const effect of target.get_effects()) {
                if (effect.toString().includes(effectName)) {
                    target.remove_effect(effect);
                }
            }

            let actor = target;
            for (let i = 0; i < 2; i++) {
                if (actor == null || actor instanceof Meta.WindowActor) {
                    break;
                }
                actor = actor.get_parent();
            }

            if (!(actor instanceof Meta.WindowActor)) {
                this.#sendPickedWindow(NotFoundWindowString);
                return;
            }

            this.#sendPickedWindow(
                actor.metaWindow.get_wm_class_instance() ?? NotFoundWindowString,
            );
        });

        inspector.connect('closed', () => {
            lookingGlass.close();
        });
    }

    export() {
        this.#dbus.export(
            Gio.DBus.session,
            objectPath,
        );
    }

    unexport() {
        this.#dbus.unexport();
    }
}
