import { Injectable } from '@angular/core';
import { EventService } from './eventService';
import { EventType } from '../model/event/eventType';

@Injectable()
export class ElectronService {

    private _electron: Electron.RendererInterface;

    private get electron(): Electron.RendererInterface {
        if (!this._electron) {
            if (window && window.require) {
                this._electron = window.require('electron');
                return this._electron;
            }
            return null;
        }
        return this._electron;
    }

    public get isElectronApp(): boolean {
        return !!window.navigator.userAgent.match(/Electron/);
    }

    public get isMacOS(): boolean {
        return this.isElectronApp && process.platform === 'darwin';
    }

    public get isWindows(): boolean {
        return this.isElectronApp && process.platform === 'win32';
    }

    public get isLinux(): boolean {
        return this.isElectronApp && process.platform === 'linux';
    }

    public get isX86(): boolean {
        return this.isElectronApp && process.arch === 'ia32';
    }

    public get isX64(): boolean {
        return this.isElectronApp && process.arch === 'x64';
    }

    public get isArm(): boolean {
        return this.isElectronApp && process.arch === 'arm';
    }

    public get desktopCapturer(): Electron.DesktopCapturer {
        return this.electron ? this.electron.desktopCapturer : null;
    }

    public get ipcRenderer(): Electron.IpcRenderer {
        return this.electron ? this.electron.ipcRenderer : null;
    }

    public get remote(): Electron.Remote {
        return this.electron ? this.electron.remote : null;
    }

    public get webFrame(): Electron.WebFrame {
        return this.electron ? this.electron.webFrame : null;
    }

    public get clipboard(): Electron.Clipboard {
        return this.electron ? this.electron.clipboard : null;
    }

    public get crashReporter(): Electron.CrashReporter {
        return this.electron ? this.electron.crashReporter : null;
    }

    public get process(): any {
        return this.remote ? this.remote.process : null;
    }

    public get nativeImage(): typeof Electron.nativeImage {
        return this.electron ? this.electron.nativeImage : null;
    }

    public get screen(): Electron.Screen {
        return this.electron ? this.remote.screen : null;
    }

    public get shell(): Electron.Shell {
        return this.electron ? this.electron.shell : null;
    }

    public constructor(_eventService: EventService) {
        _eventService
            .getEvent(ev => ev.type === EventType.OPENED_FILE_CHANGED)
            .subscribe(_ => this.webFrame.clearCache());
    }
}
