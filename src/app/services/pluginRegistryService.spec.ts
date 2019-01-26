import { TestBed, async } from '@angular/core/testing';
import { PluginRegistryService } from './pluginRegistryService';
import { take } from 'rxjs/operators/take';

describe('Pluginregistry Service', () => {
    beforeEach(async(() => {

        TestBed.configureTestingModule({
        }).compileComponents();
    }));

    describe('initialize', () => {

        it('should have a plugin store and a subject', async(() => {
            const cut = new PluginRegistryService();
            expect(cut['plugins']).not.toBeNull();
            expect(cut['pluginSubject']).not.toBeNull();
        }));

        it('should emit plugins after adding one', async(() => {
            const cut = new PluginRegistryService();
            cut.registerPlugin('TestPlugin1');
            cut.getPlugins().pipe(take(1)).subscribe(plugins => {
                expect(plugins.size).toBe(1);
            });
            cut.registerPlugin('TestPlugin2');
            cut.getPlugins().pipe(take(1)).subscribe(plugins => {
                expect(plugins.size).toBe(2);
            });

        }));
    });
});