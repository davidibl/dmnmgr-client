import { TestBed, async } from '@angular/core/testing';
import { EventService } from './eventService';
import { BaseEvent } from '../model/event/event';

describe('Event Service', () => {
    beforeEach(async(() => {

        TestBed.configureTestingModule({
        }).compileComponents();
    }));

    describe('initialize', () => {

        it('should have a event bus', async(() => {
            const cut = new EventService();
            expect(cut.getEvent(null)).not.toBeNull();
        }));

        it('should publish events generally', async(() => {
            const testEvent = new BaseEvent('x', {});

            const cut = new EventService();
            cut.publishEvent(testEvent);

            cut.getEvent(() => true).subscribe(ev => {
                expect(ev).toEqual(testEvent);
            });

        }));

        it('should filter events by anything', async(() => {
            const expectedId = 'x';
            const testEvent = new BaseEvent(expectedId, { test: 'a' });
            const testEventNotSubscribed = new BaseEvent('y', { test: 'b' });

            const cut = new EventService();

            cut.getEvent((ev) => ev.type === expectedId).subscribe(ev => {
                expect(ev).toEqual(testEvent);
            });

            cut.publishEvent(testEvent);
            cut.publishEvent(testEventNotSubscribed);
        }));
    });
});
