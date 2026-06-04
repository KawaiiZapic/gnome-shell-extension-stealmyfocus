import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

const connection = Gio.DBus.session;
const busName = 'org.gnome.Shell';
const interfaceName = 'org.gnome.Shell.Extensions.StealMyFocus';
const objectPath = '/org/gnome/shell/extensions/StealMyFocus';
const NotFoundWindowString = "!!no-window-picked!!";

export default class FocusMyWindowPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window._settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        const modeGroup = new Adw.PreferencesGroup({
            title: _('Whitelist Mode'),
            description: _('When enabled, only listed windows are allowed to be auto focused. When disabled, all windows except those listed are allowed.'),
        });
        page.add(modeGroup);

        const modeRow = new Adw.SwitchRow({
            title: _('Whitelist mode'),
        });
        modeGroup.add(modeRow);

        window._settings.bind('whitelist-mode', modeRow, 'active',
            Gio.SettingsBindFlags.DEFAULT);

        const listGroup = new Adw.PreferencesGroup({
            title: _('Window List'),
            description: _('Case-insensitive WM_CLASS patterns to match.'),
        });
        page.add(listGroup);

        const listBox = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.NONE,
            css_classes: ['boxed-list'],
            margin_top: 6,
        });
        listGroup.add(listBox);

        const addRow = new Adw.EntryRow({
            title: _('Add new pattern'),
            show_apply_button: true
        });
        listGroup.add(addRow);

        addRow.connect('apply', () => {
            const text = addRow.get_text().trim();
            if (text) {
                const current = window._settings.get_strv('window-list');
                if (!current.includes(text)) {
                    current.push(text);
                    window._settings.set_strv('window-list', current);
                    this._rebuildList(listBox, window._settings, this);
                }
                addRow.set_text('');
                // Hide apply button after user submit
                addRow.show_apply_button = false;
                addRow.show_apply_button = true;
            }
        });

        const pickButton = new Gtk.Button({
            label: _('Pick a window'),
            valign: Gtk.Align.CENTER,
            css_classes: ['pill'],
        });
        pickButton.connect('clicked', () => {
            pickWindow().then((wmclass) => {
                if (wmclass) {
                const current = window._settings.get_strv('window-list');
                if (!current.includes(wmclass)) {
                    current.push(wmclass);
                    window._settings.set_strv('window-list', current);
                    this._rebuildList(listBox, window._settings, this);
                }
                addRow.set_text('');
            }
            }).catch(() => {});
        });
        listGroup.set_header_suffix(pickButton);

        this._rebuildList(listBox, window._settings, this);
    }

    _rebuildList(listBox, settings, self) {
        let child = listBox.get_first_child();
        while (child) {
            const next = child.get_next_sibling();
            listBox.remove(child);
            child = next;
        }

        const items = settings.get_strv('window-list');
        for (const item of items) {
            const row = new Adw.ActionRow({
                title: item,
            });

            const removeBtn = new Gtk.Button({
                icon_name: 'user-trash-symbolic',
                valign: Gtk.Align.CENTER,
                css_classes: ['destructive-action', 'flat'],
            });
            removeBtn.connect('clicked', () => {
                const current = settings.get_strv('window-list');
                const idx = current.indexOf(item);
                if (idx !== -1) {
                    current.splice(idx, 1);
                    settings.set_strv('window-list', current);
                    self._rebuildList(listBox, settings, self);
                }
            });
            row.add_suffix(removeBtn);

            listBox.append(row);
        }

        if (items.length === 0) {
            const emptyRow = new Adw.ActionRow({
                title: _('No entries'),
                subtitle: _('Add a window to get started.'),
                sensitive: false,
            });
            listBox.append(emptyRow);
        }
    }
}

async function pickWindow() {
    connection.call(
        busName,
        objectPath,
        interfaceName,
        'pick',
        null,
        null,
        Gio.DBusCallFlags.NO_AUTO_START,
        -1,
        null,
        null,
    );

    return new Promise((res, rej) => {
      const id = connection.signal_subscribe(
        busName,
        interfaceName,
        'picked',
        objectPath,
        null,
        Gio.DBusSignalFlags.NONE,
        (_conn, _sender, _objectPath, _iface, _signal, params) => {
            const val = params.get_child_value(0)?.get_string()[0];
            if (val === NotFoundWindowString) {
              rej(val);
            } else {
              res(val);
            }
            connection.signal_unsubscribe(id);
        },
      );
    });
}
