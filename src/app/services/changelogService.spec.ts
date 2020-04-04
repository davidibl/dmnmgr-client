import { TestBed, async } from '@angular/core/testing';
import { ChangelogService } from './changelogService';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

const changelogEntry =
`
## <small>0.0.27 (2020-03-02)</small>

* 0.0.27 ([181b877](https://github.com/davidibl/dmnmgr-client/commit/181b877))
* FIX: automatically generate changelog on release ([297f7bb](https://github.com/davidibl/dmnmgr-client/commit/297f7bb))
* FEAT: New changelog dialog ([b5759ad](https://github.com/davidibl/dmnmgr-client/commit/b5759ad))
`;

const changelogEntryWithExtraNoVersion =
`
* FEAT: Any Change ([b5759ad](https://github.com/davidibl/dmnmgr-client/commit/b5759ad))

## <small>0.0.27 (2020-03-02)</small>

* 0.0.27 ([181b877](https://github.com/davidibl/dmnmgr-client/commit/181b877))
* FIX: automatically generate changelog on release ([297f7bb](https://github.com/davidibl/dmnmgr-client/commit/297f7bb))
* FEAT: New changelog dialog ([b5759ad](https://github.com/davidibl/dmnmgr-client/commit/b5759ad))
`;

const changelogTwoEntries =
`
## <small>0.0.27 (2020-03-02)</small>

* 0.0.27 ([181b877](https://github.com/davidibl/dmnmgr-client/commit/181b877))
* FIX: automatically generate changelog on release ([297f7bb](https://github.com/davidibl/dmnmgr-client/commit/297f7bb))
* FEAT: New changelog dialog and changelog ([b5759ad](https://github.com/davidibl/dmnmgr-client/commit/b5759ad))



## <small>0.0.26 (2020-03-02)</small>

* 0.0.26 ([901beb2](https://github.com/davidibl/dmnmgr-client/commit/901beb2))
* IMPROV: Correct reset of marked rules in modelere after revalidation ([6149023](https://github.com/davidibl/dmnmgr-client/commit/6149023))
* CHORE: Improved HTML and format of docs ([2255607](https://github.com/davidibl/dmnmgr-client/commit/2255607))
`;

const changelogAllTypes =
`
## <small>0.0.27 (2020-03-02)</small>

* 0.0.27 ([181b877](https://github.com/davidibl/dmnmgr-client/commit/181b877))
* FIX: automatically generate changelog on release ([297f7bb](https://github.com/davidibl/dmnmgr-client/commit/297f7bb))
* FEAT: New changelog dialog and changelog ([b5759ad](https://github.com/davidibl/dmnmgr-client/commit/b5759ad))
* IMPROV: Correct reset of marked rules in modelere after revalidation ([6149023](https://github.com/davidibl/dmnmgr-client/commit/6149023))
* CHORE: Improved HTML and format of docs ([2255607](https://github.com/davidibl/dmnmgr-client/commit/2255607))
`;


describe('ChangelogService', () => {

    let cut: ChangelogService;
    let httpMock: HttpTestingController;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule,
            ],
            providers: [
                ChangelogService,
            ],
        });
        cut = TestBed.get(ChangelogService);
        httpMock = TestBed.get(HttpTestingController);
    }));

    describe('get changelog', () => {

        it('should call http client and provide the data', async(() => {

            const changelogData = '';

            cut.getChangelog().subscribe(data => {
                expect(data.versions.length).toEqual(1);
                expect(data.versions[0].version).toEqual(cut['NEXT_VERSION']);
                expect(data.versions[0].feat.length).toBe(0);
                expect(data.versions[0].fix.length).toBe(0);
            });

            const request = httpMock.expectOne(() => true);
            expect(request.request.method).toBe('GET');
            request.flush(changelogData);
        }));

        it('should call http client and parse the data', async(() => {

            cut.getChangelog().subscribe(data => {
                expect(data.versions.length).toEqual(2);
                expect(data.versions[1].version).toEqual('0.0.27');
                expect(data.versions[1].feat.length).toBe(1);
                expect(data.versions[1].fix.length).toBe(1);
            });

            const request = httpMock.expectOne(() => true);
            expect(request.request.method).toBe('GET');
            request.flush(changelogEntry);
        }));

        it('should provide everything on top of the latest version in an extra version', async(() => {

            cut.getChangelog().subscribe(data => {
                expect(data.versions.length).toEqual(2);
                expect(data.versions[1].version).toEqual('0.0.27');

                expect(data.versions[0].version).toEqual(cut['NEXT_VERSION']);
                expect(data.versions[0].feat.length).toBe(1);
                expect(data.versions[0].feat[0].message).toBe('Any Change');
            });

            const request = httpMock.expectOne(() => true);
            expect(request.request.method).toBe('GET');
            request.flush(changelogEntryWithExtraNoVersion);
        }));

        it('should provide more than one entry', async(() => {

            cut.getChangelog().subscribe(data => {
                expect(data.versions.length).toEqual(3);
                expect(data.versions[2].version).toEqual('0.0.26');
                expect(data.versions[1].version).toEqual('0.0.27');
                expect(data.versions[0].version).toEqual(cut['NEXT_VERSION']);
            });

            const request = httpMock.expectOne(() => true);
            expect(request.request.method).toBe('GET');
            request.flush(changelogTwoEntries);
        }));

        it('should parse correctly all message types IMPROV, FEAT, FIX, CHORE', async(() => {

            cut.getChangelog().subscribe(data => {
                expect(data.versions.length).toEqual(2);
                expect(data.versions[1].chore.length).toBe(1);
                expect(data.versions[1].feat.length).toBe(1);
                expect(data.versions[1].fix.length).toBe(1);
                expect(data.versions[1].improv.length).toBe(1);
            });

            const request = httpMock.expectOne(() => true);
            expect(request.request.method).toBe('GET');
            request.flush(changelogAllTypes);
        }));
    });
});
