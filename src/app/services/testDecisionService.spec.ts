import { TestBed, async } from '@angular/core/testing';
import { EventService } from './eventService';
import { TestDecisionService } from './testDecisionService';
import { AppConfigurationService } from './appConfigurationService';
import { DmnXmlService } from './dmnXmlService';
import { NewViewEvent } from '../model/event/newViewEvent';
import { DecisionSimulationResult } from '../model/decisionSimulationResult';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { IDecisionSimulationResponse } from '../model/decisionSimulationResponse';
import { RenameArtefactEvent } from '../model/event/renameArtefactEvent';
import { Test } from '../model/test';

const artefactId = 'aaa';
const hitRule = 'XYZ';
const dmnXml = '<dmn>';
const simulatorUrl = 'url://';
const expectedSimulationResultOk = new DecisionSimulationResult([]);
const expectedSimulationResultOneHit = new DecisionSimulationResult([], null, [hitRule]);
const httpReturnValueEmpty = <IDecisionSimulationResponse>{result: []};
const httpReturnValueOneHit = <IDecisionSimulationResponse>{result: [], message: null, resultRuleIds: [hitRule]};

describe('TestDecisionService', () => {

    let cut: TestDecisionService;
    let eventService: EventService;
    let dmnXmlService: jasmine.SpyObj<DmnXmlService>;
    let configurationService: jasmine.SpyObj<AppConfigurationService>;
    let httpMock: HttpTestingController;

    beforeEach(async(() => {
        const dmnXmlServiceSpy = jasmine.createSpyObj('DmnXmlService', ['getXmlModels']);
        const configurationServiceSpy = jasmine.createSpyObj('AppConfigurationService', ['getBaseUrlSimulator']);

        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule,
            ],
            providers: [
                TestDecisionService,
                EventService,
                { provide: DmnXmlService, useValue: dmnXmlServiceSpy },
                { provide: AppConfigurationService, useValue: configurationServiceSpy },
            ]
        });

        cut = TestBed.inject(TestDecisionService);
        eventService = TestBed.inject(EventService);
        dmnXmlService = <any>TestBed.inject(DmnXmlService);
        configurationService = <any>TestBed.inject(AppConfigurationService);
        httpMock = TestBed.get(HttpTestingController);

        eventService.publishEvent(new NewViewEvent(artefactId));
        dmnXmlService.getXmlModels.and.returnValue(of(dmnXml));
        configurationService.getBaseUrlSimulator.and.returnValue(of(simulatorUrl));
    }));

    describe('Simulation', () => {

        it('should simulate a decision and provide the result', async(() => {

            cut.simulateDecision({});

            const request = httpMock.expectOne(() => true);
            expect(request.request.method).toBe('POST');
            request.flush(httpReturnValueEmpty);

            cut.getResult().subscribe(result => expect(result).toEqual(expectedSimulationResultOk));
        }));

        it('should simulate a decision and provide a rule got hit', async(() => {

            cut.simulateDecision({});

            const request = httpMock.expectOne(() => true);
            expect(request.request.method).toBe('POST');
            request.flush(httpReturnValueOneHit);

            cut.getResult().subscribe(result => expect(result).toEqual(expectedSimulationResultOneHit));
        }));

        it('should post expectation, current xml and artefactId', async(() => {

            const expectedData = { test: 1 };
            cut.simulateDecision(expectedData);

            const request = httpMock.expectOne(() => true);
            expect(request.request.method).toBe('POST');
            expect(request.request.body).toEqual({ dmnTableId: artefactId, variables: expectedData, xml: dmnXml });
            request.flush(httpReturnValueOneHit);

            cut.getResult().subscribe();
        }));
    });

    describe('Test Decision', () => {

        it('should test a decision', async(() => {
            const test = <Test>{ expectedData: [{test: 1}], data: {data: 2}, name: 'test1' };
            const postBody = {
                dmnTableId: artefactId,
                variables: test.data,
                xml: dmnXml,
                expectedData: test.expectedData
            };

            cut.testDecision(test, dmnXml).subscribe(result => expect(result).not.toBeNull());

            const request = httpMock.expectOne(() => true);
            expect(request.request.method).toBe('POST');
            expect(request.request.body).toEqual(postBody);
            request.flush({});
        }));

        it('should test a decision and use provided artefactId', async(() => {
            const test = <Test>{ expectedData: [{test: 1}], data: {data: 2}, name: 'test1' };
            const anyXml = '<other_dmn>';
            const otherArtefactId = 'nnn';
            const postBody = {
                dmnTableId: otherArtefactId,
                variables: test.data,
                xml: anyXml,
                expectedData: test.expectedData
            };

            cut.testDecision(test, anyXml, otherArtefactId).subscribe(result => expect(result).not.toBeNull());

            const request = httpMock.expectOne(() => true);
            expect(request.request.method).toBe('POST');
            expect(request.request.body).toEqual(postBody);
            request.flush({});
        }));

        it('should fetch xml from service when deployAndTest is called', async(() => {
            const test = <Test>{ expectedData: [{test: 1}], data: {data: 2}, name: 'test1' };
            const postBody = {
                dmnTableId: artefactId,
                variables: test.data,
                xml: dmnXml,
                expectedData: test.expectedData
            };

            cut.deployAndTestDecision(test).subscribe(result => expect(result).not.toBeNull());

            const request = httpMock.expectOne(() => true);
            expect(request.request.method).toBe('POST');
            expect(request.request.body).toEqual(postBody);
            request.flush({});

            expect(dmnXmlService.getXmlModels).toHaveBeenCalledTimes(1);
        }));
    });

    describe('URL Configuration and path', () => {

        it('should fetch Url from application configuration and use correct path for simulation', async(() => {

            cut.simulateDecision({});

            const request = httpMock.expectOne(() => true);
            expect(request.request.method).toBe('POST');
            expect(request.request.urlWithParams).toBe(`${simulatorUrl}${cut['API_PREFIX']}/${cut['API_PATH_SIMULATION']}`);
            request.flush({});

            expect(configurationService.getBaseUrlSimulator).toHaveBeenCalledTimes(1);
        }));

        it('should fetch Url from application configuration and use correct path for testing', async(() => {
            const test = <Test>{ expectedData: [{test: 1}], data: {data: 2}, name: 'test1' };
            cut.testDecision(test).subscribe();

            const request = httpMock.expectOne(() => true);
            expect(request.request.method).toBe('POST');
            expect(request.request.urlWithParams).toBe(`${simulatorUrl}${cut['API_PREFIX']}/${cut['API_PATH_TESTING']}`);
            request.flush({});

            expect(configurationService.getBaseUrlSimulator).toHaveBeenCalledTimes(1);
        }));
    });

    describe('ArtefactId', () => {
        it('should refresh the artefactId', async(() => {

            const artefactId2 = 'bbb';
            const artefactId3 = 'ccc';

            expect(cut['_currentArtefactId']).toEqual(artefactId);

            eventService.publishEvent(new NewViewEvent(artefactId2));

            expect(cut['_currentArtefactId']).toEqual(artefactId2);

            eventService.publishEvent(new RenameArtefactEvent(artefactId2, artefactId3));

            expect(cut['_currentArtefactId']).toEqual(artefactId3);
        }));
    });
});
