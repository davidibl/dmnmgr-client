import { TestBed, async } from '@angular/core/testing';
import { DmnXmlService } from './dmnXmlService';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { XmlProvider } from '../model/xmlProvider';
import { of } from 'rxjs';

const newDmnXml = '<dmn>';

describe('DmnXmlService', () => {

    let cut: DmnXmlService;
    let httpMock: HttpTestingController;

    beforeEach(async(() => {

        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule,
            ],
            providers: [
                DmnXmlService,
            ]
        });

        cut = TestBed.inject(DmnXmlService);
        httpMock = TestBed.get(HttpTestingController);
    }));

    describe('XML Provider', () => {

        it('should be able to retriebe and provide empty dmn xml', async(() => {

            cut.createNewDmn();

            const request = httpMock.expectOne(() => true);
            expect(request.request.method).toBe('GET');
            expect(request.request.urlWithParams).toBe(cut['_PATH']);
            request.flush(newDmnXml);

            cut.getDmnXml().subscribe(dmnXml => expect(dmnXml).toEqual(newDmnXml));
        }));

        it('should provide xml after setting it', async(() => {

            const testXml = '<testxml>';

            cut.setXml(testXml);

            cut.getDmnXml().subscribe(dmnXml => expect(dmnXml).toEqual(testXml));
        }));

        it('should register model provider and provide the xml after safefunction is called', async(() => {

            const providerType1 = 'modeler';
            const xmlFromProvider = '<dmn><xml></xml></dmn>';

            const xmlProvider = <XmlProvider>{
                type: providerType1,
                saveFunc: () => of(xmlFromProvider)
            };

            cut.registerModeller(xmlProvider);

            cut.getXmlModels(providerType1).subscribe(xml => expect(xml).toEqual(xmlFromProvider));
        }));

        it('should register multiple model provider and provide the xml by type', async(() => {

            const providerType1 = 'modeler';
            const providerType2 = 'viewer';
            const xmlFromProvider1 = '<dmn><xml></xml></dmn>';
            const xmlFromProvider2 = '<my-dmn><xml></xml></my-dmn>';

            const xmlProvider1 = <XmlProvider>{
                type: providerType1,
                saveFunc: () => of(xmlFromProvider1)
            };
            const xmlProvider2 = <XmlProvider>{
                type: providerType2,
                saveFunc: () => of(xmlFromProvider2)
            };

            cut.registerModeller(xmlProvider1);
            cut.registerModeller(xmlProvider2);

            cut.getXmlModels(providerType1).subscribe(xml => expect(xml).toEqual(xmlFromProvider1));
            cut.getXmlModels(providerType2).subscribe(xml => expect(xml).toEqual(xmlFromProvider2));
        }));

        it('should ignore a provider registered with already existing type', async(() => {

            const providerType = 'modeler';
            const xmlFromProvider = '<dmn><xml></xml></dmn>';
            const xmlFromProvider2 = '<my-dmn><xml></xml></my-dmn>';

            const xmlProvider = <XmlProvider>{
                type: providerType,
                saveFunc: () => of(xmlFromProvider)
            };
            const xmlProvider2 = <XmlProvider>{
                type: providerType,
                saveFunc: () => of(xmlFromProvider2)
            };

            cut.registerModeller(xmlProvider);
            cut.registerModeller(xmlProvider2);

            cut.getXmlModels(providerType).subscribe(xml => expect(xml).toEqual(xmlFromProvider));
        }));
    });
});
