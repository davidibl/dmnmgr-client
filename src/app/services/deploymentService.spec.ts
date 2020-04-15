import { TestBed, async } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DeploymentService } from './deploymentService';
import { DmnXmlService } from './dmnXmlService';
import { of } from 'rxjs';

const dmnXml = '<dmnxml>';

describe('DeploymentService', () => {

    let cut: DeploymentService;
    let dmnXmlService: jasmine.SpyObj<DmnXmlService>;
    let httpMock: HttpTestingController;

    beforeEach(async(() => {
        const dmnXmlServiceSpy = jasmine.createSpyObj('DmnXmlService', ['getXmlModels']);

        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule,
            ],
            providers: [
                DeploymentService,
                { provide: DmnXmlService, useValue: dmnXmlServiceSpy },
            ]
        });

        cut = TestBed.inject(DeploymentService);
        dmnXmlService = <any>TestBed.inject(DmnXmlService);
        httpMock = TestBed.get(HttpTestingController);

        dmnXmlService.getXmlModels.and.returnValue(of(dmnXml));
    }));

    describe('Deployment', () => {

        it('should deploy xml model provided by dmnXmlService to a given address', async(() => {

            const deploymentName = 'a name';
            const url = 'http://mytesturl';
            cut.deployXml(url, deploymentName).subscribe();

            const request = httpMock.expectOne(() => true);
            expect(request.request.method).toBe('POST');
            expect(request.request.url).toBe(url);
            expect(request.request.body).toEqual({xml: dmnXml, deploymentName: deploymentName});
            request.flush({});
        }));
    });
});
