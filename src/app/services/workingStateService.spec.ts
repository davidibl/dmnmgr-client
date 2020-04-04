import { async } from '@angular/core/testing';
import { WorkingStateService } from './workingStateService';
import { take } from 'rxjs/operators';

let cut: WorkingStateService;

describe('WorkingStateService', () => {
    beforeEach(async(() => {
        cut = new WorkingStateService();
    }));

    describe('Provide State', () => {

        it('initially provide base state', async(() => {

            cut.getWorkingState().subscribe(result => {
                expect(result).toEqual(cut['baseState']);
            });
        }));

        it('should provide any set state', async(() => {

            const newState = 'test';
            const stateId = 'test1';

            cut.setState(stateId, newState);
            cut.getWorkingState().subscribe(result => {
                expect(result).toEqual(newState);
            });
        }));

        it('should provide the last set state', async(() => {

            const newState = 'test';
            const stateId = 'test1';
            const newState2 = 'test2';

            cut.setState(stateId, newState);
            cut.setState(stateId, newState2);
            cut.getWorkingState().subscribe(result => {
                expect(result).toEqual(newState2);
            });
        }));

        it('should reset state', async(() => {

            const newState = 'test';
            const stateId = 'test1';

            cut.setState(stateId, newState);

            cut.getWorkingState().pipe(take(1)).subscribe(result => {
                expect(result).toEqual(newState);

                cut.resetState(stateId);
                cut.getWorkingState().subscribe(secondState => expect(secondState).toEqual(cut['baseState']));
            });
        }));

        it('should return to another state when one is resetted', async(() => {

            const newState = 'test';
            const stateId = 'test1';

            const newState2 = 'test2';
            const stateId2 = 'test2';

            cut.setState(stateId, newState);
            cut.setState(stateId2, newState2);

            cut.getWorkingState().pipe(take(1)).subscribe(result => {
                expect(result).toEqual(newState2);

                cut.resetState(stateId2);
                cut.getWorkingState().subscribe(secondState => expect(secondState).toEqual(newState));
            });
        }));

        it('should return to base state when all states are resetted', async(() => {

            const newState = 'test';
            const stateId = 'test1';

            const newState2 = 'test2';
            const stateId2 = 'test2';

            cut.setState(stateId, newState);
            cut.setState(stateId2, newState2);

            cut.getWorkingState().pipe(take(1)).subscribe(result => {
                expect(result).toEqual(newState2);

                cut.resetState(stateId2);
                cut.resetState(stateId);
                cut.getWorkingState().subscribe(secondState => expect(secondState).toEqual(cut['baseState']));
            });
        }));
    });
});
