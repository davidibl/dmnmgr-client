import { TestBed, async } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DmnValidationService } from './dmnValidationService';
import { DmnXmlService } from './dmnXmlService';
import { AppConfigurationService } from './appConfigurationService';
import { WorkingStateService } from './workingStateService';
import { EventService } from './eventService';
import { IDmnValidationResponse } from '../model/dmnValidationResponse';
import { of } from 'rxjs';
import { take } from 'rxjs/operators';
import { WebserviceErrorType } from '../model/webserviceError';
import { BaseEvent } from '../model/event/event';
import { EventType } from '../model/event/eventType';

const anyValidationResult = <IDmnValidationResponse>{ errors: [{ruleId: 'xxx'}]};

describe('DmnValidationService', () => {

    let cut: DmnValidationService;
    let httpMock: HttpTestingController;

    let dmnXmlService: jasmine.SpyObj<DmnXmlService>;
    let configurationService: jasmine.SpyObj<AppConfigurationService>;
    let workingStateService: jasmine.SpyObj<WorkingStateService>;
    let eventService: EventService;

    beforeEach(async(() => {

        const dmnXmlServiceSpy = jasmine.createSpyObj('DmnXmlService', ['getXmlModels']);
        const configurationServiceSpy = jasmine.createSpyObj('AppConfigurationService', ['getAutoValidation', 'getBaseUrlSimulator']);
        const workingStateServiceSpy = jasmine.createSpyObj('WorkingStateService', ['setState', 'resetState']);

        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule,
            ],
            providers: [
                DmnValidationService,
                EventService,
                { provide: DmnXmlService, useValue: dmnXmlServiceSpy },
                { provide: AppConfigurationService, useValue: configurationServiceSpy },
                { provide: WorkingStateService, useValue: workingStateServiceSpy },
            ]
        });

        cut = TestBed.inject(DmnValidationService);
        httpMock = TestBed.get(HttpTestingController);
        eventService = TestBed.inject(EventService);
        dmnXmlService = <any>TestBed.inject(DmnXmlService);
        configurationService = <any>TestBed.inject(AppConfigurationService);
        workingStateService = <any>TestBed.inject(WorkingStateService);

        dmnXmlService.getXmlModels.and.returnValue(of('<dmn>'));
        configurationService.getBaseUrlSimulator.and.returnValue(of('url://'));
    }));

    describe('XML Provider', () => {

        it('should initialize', async(() => {

            expect(cut).not.toBeNull();
        }));

        it('should validate when requested and reset current state prior validation', async(() => {
            const validationResult = <IDmnValidationResponse> {
                errors: [{counterRuleId: '1', message: 'msg_error', ruleId: '1', severity: 'error', tableId: 'x'}],
                warnings: [{counterRuleId: '1', message: 'msg_warning', ruleId: '1', severity: 'warning', tableId: 'x'}],
            };

            cut.validate();

            cut.getLastValidationResult().pipe(take(1)).subscribe(result =>
                expect(result).toEqual(<IDmnValidationResponse>{}));

            const request = httpMock.expectOne(() => true);
            expect(request.request.method).toBe('POST');
            request.flush(validationResult);

            cut.getLastValidationResult().pipe(take(1)).subscribe(result =>
                expect(result).toEqual(validationResult));
        }));

        it('should provide an error when no url is defined', async(() => {
            configurationService.getBaseUrlSimulator.and.returnValue(of(null));

            cut.validate();

            cut.getLastValidationResult().pipe(take(1)).subscribe(result =>
                expect(result).toEqual(<IDmnValidationResponse>{}));

            httpMock.expectNone(() => true);

            cut.getError().subscribe(error => {
                expect(error).not.toBeNull();
                expect(error.type).toEqual(WebserviceErrorType.URL_NOT_DEFINED);
            });
        }));

        it('should provide a correct application state', async(() => {

            cut.validate();

            cut.getLastValidationResult().pipe(take(1)).subscribe(result =>
                expect(result).toEqual(<IDmnValidationResponse>{}));

            const request = httpMock.expectOne(() => true);
            expect(request.request.method).toBe('POST');
            request.flush(<IDmnValidationResponse>{});

            expect(workingStateService.setState).toHaveBeenCalledTimes(1);
            expect(workingStateService.setState).toHaveBeenCalledWith(
                cut['validationWorkingStateId'], cut['workingStateLabel']);
            expect(workingStateService.resetState).toHaveBeenCalledTimes(1);
            expect(workingStateService.resetState).toHaveBeenCalledWith(cut['validationWorkingStateId']);
        }));

        it('should clear error when validating', async(() => {

            configurationService.getBaseUrlSimulator.and.returnValue(of(null));
            cut.validate();

            cut.getError().pipe(take(1)).subscribe(error => expect(error).not.toBeNull());

            configurationService.getBaseUrlSimulator.and.returnValue(of('url://'));
            cut.validate();

            const request = httpMock.expectOne(() => true);
            expect(request.request.method).toBe('POST');
            request.flush(<IDmnValidationResponse>{});

            cut.getError().pipe(take(1)).subscribe(error => expect(error).toBeNull());
        }));

        it('should validate on xml loaded event when autovalidation is true', async(() => {

            configurationService.getAutoValidation.and.returnValue(of(true));

            eventService.publishEvent(new BaseEvent(EventType.XML_LOADED));

            const request = httpMock.expectOne(() => true);
            expect(request.request.method).toBe('POST');
            request.flush(anyValidationResult);

            cut.getLastValidationResult().subscribe(result => expect(result).toEqual(anyValidationResult));
        }));

        it('should not validate on xml loaded event when autovalidation is false', async(() => {

            configurationService.getAutoValidation.and.returnValue(of(false));

            eventService.publishEvent(new BaseEvent(EventType.XML_LOADED));

            httpMock.expectNone(() => true);
        }));

        it('should validate on project save event when autovalidation is true', async(() => {

            configurationService.getAutoValidation.and.returnValue(of(true));

            eventService.publishEvent(new BaseEvent(EventType.PROJECT_SAVED));

            const request = httpMock.expectOne(() => true);
            expect(request.request.method).toBe('POST');
            request.flush(anyValidationResult);

            cut.getLastValidationResult().subscribe(result => expect(result).toEqual(anyValidationResult));
        }));

        it('should not validate on project save event when autovalidation is false', async(() => {

            configurationService.getAutoValidation.and.returnValue(of(false));

            eventService.publishEvent(new BaseEvent(EventType.PROJECT_SAVED));

            httpMock.expectNone(() => true);
        }));

        it('should reset last reault when autosave is false on xml Loaded event', async(() => {

            configurationService.getAutoValidation.and.returnValue(of(false));

            eventService.publishEvent(new BaseEvent(EventType.XML_LOADED));

            httpMock.expectNone(() => true);

            cut.getLastValidationResult().subscribe(result => expect(result).toEqual(<IDmnValidationResponse>{}));
        }));
    });
});
