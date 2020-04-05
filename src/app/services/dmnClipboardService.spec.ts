import { async } from '@angular/core/testing';
import { DmnClipboardService, ClipBoardDataType, ClipboardData } from './dmnClipboardService';

describe('dmnClipboardService', () => {

    let cut: DmnClipboardService;

    beforeEach(async(() => {
        cut = new DmnClipboardService();
    }));

    describe('copy', () => {

        it('should provide copied data', async(() => {

            const data = 'test';

            cut.copyData(ClipBoardDataType.DMN_RULES, data);
            cut.getData().subscribe(copiedData =>
                    expect(copiedData).toEqual(new ClipboardData(ClipBoardDataType.DMN_RULES, data)));
        }));

        it('should provide null when nothing copied', async(() => {

            cut.getData().subscribe(copiedData => expect(copiedData).toBe(null));
        }));
    });
});
