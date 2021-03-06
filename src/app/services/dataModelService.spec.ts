import { TestBed, async } from '@angular/core/testing';
import { DataModelService } from './dataModelService';
import { EventService } from './eventService';
import { NewViewEvent } from '../model/event/newViewEvent';
import { DataModelProject } from '../model/project/dataModelProject';
import { ObjectDefinition } from '../model/json/objectDefinition';
import { take } from 'rxjs/operators';
import { RenameArtefactEvent } from '../model/event/renameArtefactEvent';
import { DecisionDeleteEvent } from '../model/event/decisionDeleteEvent';

const artefactId1 = 'aaa';
const artefactId2 = 'bbb';
const modelName1 = 'myModel';
const modelName2 = 'myModel';

const enumValues = ['TEST', 'TEST2'];
const stringDataType = 'string';
const integerDataType = 'integer';

let dataModel1;
let dataModelNewProperty;
let dataModel2;
let dataWithModel1WithEnumAndString;
let dataWithModel1And2;
let dataWithModel1ReferencingModel2;

function setupDataModels () {
    dataModel1 = <ObjectDefinition>{ name: modelName1, properties: [
        { name: 'a', properties: [
            { name: 'b', properties: [
                { name: 'c', type: 'enumeration', enum: enumValues },
                { name: 'e', type: stringDataType }
            ]}
        ]}
    ]};

    dataModelNewProperty = <ObjectDefinition>{ name: modelName1, properties: [
        { name: 'a', properties: [
            { name: 'b', properties: [
                { name: 'c', type: 'enumeration', enum: enumValues },
                { name: 'e', type: integerDataType }
            ]},
            { name: 'x', type: integerDataType }
        ]}
    ]};

    dataModel2 = <ObjectDefinition>{ name: modelName2, properties: [
        { name: 'a', properties: [
            { name: 'b', properties: [
                { name: 'c', type: 'enumeration', enum: enumValues },
                { name: 'e', type: stringDataType }
            ]},
            { name: 'x', type: integerDataType }
        ]}
    ]};

    dataWithModel1WithEnumAndString = <DataModelProject>{
        [artefactId1]: { requestModel: dataModel1 }
    };

    dataWithModel1And2 = <DataModelProject>{
        [artefactId1]: { requestModel: dataModel1 },
        [artefactId2]: { requestModel: dataModel2 }
    };

    dataWithModel1ReferencingModel2 = <DataModelProject>{
        [artefactId1]: {
            requestModel: { name: `#ref/${artefactId2}` }
        },
        [artefactId2]: { requestModel: dataModel2 }
    };
}

describe('DataModelService', () => {

    let cut: DataModelService;
    let eventService: EventService;

    beforeEach(async(() => {
        setupDataModels();
        const eventServiceSpy = jasmine.createSpyObj('EventService', ['publishEvent', 'getEvent']);

        TestBed.configureTestingModule({
            providers: [
                DataModelService,
                EventService,
            ]
        });

        cut = TestBed.inject(DataModelService);
        eventService = TestBed.inject(EventService);
    }));

    describe('ArtefactId', () => {

        it('should store the current artefact id', async(() => {

            const nextArtefactId = 'aaa';
            eventService.publishEvent(new NewViewEvent(nextArtefactId, true));

            expect(cut['_currentArtefactId']).toBe(nextArtefactId);
        }));

        it('should provide the model for the current artefactId', async(() => {

            cut['_dataModelProject'] = {
                [artefactId1]: { requestModel: { name: modelName1 } }
            };
            eventService.publishEvent(new NewViewEvent(artefactId1, true));

            cut.getDataModel().subscribe(model => {
                expect(model.name).toBe(modelName1);
            });
        }));

        it('should provide null when there is no model for the current artefactId', async(() => {

            const unknownArtefactId = 'bbb';

            cut['_dataModelProject'] = {
                [artefactId1]: { requestModel: { name: modelName1 } }
            };
            eventService.publishEvent(new NewViewEvent(unknownArtefactId, true));

            cut.getDataModel().subscribe(model => {
                expect(model).toBe(null);
            });
        }));

        it('should provide referenced data model', async(() => {

            cut['_dataModelProject'] = dataWithModel1ReferencingModel2;

            eventService.publishEvent(new NewViewEvent(artefactId1, true));

            cut.getDataModel().subscribe(model => {
                expect(model).toEqual(dataModel2);
            });
        }));

        it('should rename model when table is renamed and align referenced models', async(() => {

            cut['_dataModelProject'] = dataWithModel1ReferencingModel2;

            eventService.publishEvent(new NewViewEvent(artefactId2));
            eventService.publishEvent(new RenameArtefactEvent(artefactId2, 'neuerName'));

            cut.getDataModel().pipe(take(1)).subscribe(model => {
                expect(model).toEqual(dataModel2);
            });

            eventService.publishEvent(new NewViewEvent(artefactId1));

            cut.getDataModel().pipe(take(1)).subscribe(model => {
                expect(model).toEqual(dataModel2);
            });
        }));

        it('should delete a decision table data model', async(() => {

            cut['_dataModelProject'] = dataWithModel1And2;

            expect(cut.getDataModelProject()[artefactId2]).not.toBeNull();

            eventService.publishEvent(new NewViewEvent(artefactId2));
            eventService.publishEvent(new DecisionDeleteEvent(artefactId2));

            expect(cut.getDataModelProject()[artefactId2]).toBeUndefined();
        }));

        it('should open a new model on set and provide nothing immidiatly', async(() => {

            cut['_dataModelProject'] = dataWithModel1And2;
            eventService.publishEvent(new NewViewEvent(artefactId2));

            cut.getDataModel().pipe(take(1)).subscribe(model => expect(model).not.toBeNull());

            cut.setDataModelProject(dataWithModel1ReferencingModel2);

            cut.getDataModel().pipe(take(1)).subscribe(model => expect(model).toBeNull());
        }));
    });

    describe('Access Properties', () => {

        it('should provide a property by path of the current model', async(() => {
            cut['_dataModelProject'] = dataWithModel1WithEnumAndString;

            eventService.publishEvent(new NewViewEvent(artefactId1, true));

            cut.getPropertyByPath('a.b.e').subscribe(property => {
                expect(property.name).toBe('e');
                expect(property.type).toBe('string');
            });
        }));

        it('should provide a property by path of the current model with juel notation', async(() => {
            cut['_dataModelProject'] = dataWithModel1WithEnumAndString;

            eventService.publishEvent(new NewViewEvent(artefactId1, true));

            cut.getPropertyByPath('${a.b.e}').subscribe(property => {
                expect(property.name).toBe('e');
                expect(property.type).toBe('string');
            });
        }));

        it('should provide a null if a property is not found by path', async(() => {
            cut['_dataModelProject'] = dataWithModel1WithEnumAndString;

            eventService.publishEvent(new NewViewEvent(artefactId1, true));

            cut.getPropertyByPath('a.b.d').subscribe(property => {
                expect(property).toBe(null);
            });
        }));

        it('should provide enumeration values from data model by path', async(() => {
            cut['_dataModelProject'] = dataWithModel1WithEnumAndString;

            eventService.publishEvent(new NewViewEvent(artefactId1, true));

            cut.getEnumValuesByPath('a.b.c').subscribe(values => {
                expect(values.length).toBe(2);
                expect(values).toEqual(enumValues);
            });
        }));

        it('should provide datatype data model by path', async(() => {
            cut['_dataModelProject'] = dataWithModel1WithEnumAndString;

            eventService.publishEvent(new NewViewEvent(artefactId1, true));

            cut.getDatatypeByPath('a.b.e').subscribe(type => {
                expect(type).toEqual(stringDataType);
            });
        }));

        it('should provide datatype of referenced data model by path', async(() => {
            cut['_dataModelProject'] = dataWithModel1ReferencingModel2;

            eventService.publishEvent(new NewViewEvent(artefactId1, true));

            cut.getDatatypeByPath('a.b.e').subscribe(type => {
                expect(type).toEqual(integerDataType);
            });
        }));
    });

    describe('Edit Datamodel', () => {

        it('should provide initial datamodel', async(() => {
            cut['_dataModelProject'] = dataWithModel1WithEnumAndString;

            eventService.publishEvent(new NewViewEvent(artefactId1, true));

            cut.getDataModel().pipe(take(1)).subscribe(model => expect(model).toEqual(dataModel1));

        }));

        it('should create a new model and provide it', async(() => {
            cut['_dataModelProject'] = dataWithModel1WithEnumAndString;

            eventService.publishEvent(new NewViewEvent(artefactId1, true));

            cut.getDataModel().pipe(take(1)).subscribe(model => expect(model).toEqual(dataModel1));

            cut.newDataModel({});

            cut.getDataModel().pipe(take(1)).subscribe(model => expect(model).toEqual({}));

        }));

        it('should provide changes to the datamodel', async(() => {
            cut['_dataModelProject'] = dataWithModel1WithEnumAndString;

            eventService.publishEvent(new NewViewEvent(artefactId1, true));

            cut.dataModelChanged(dataModelNewProperty);

            cut.getDataModel().pipe(take(1)).subscribe(model => expect(model).toEqual(dataModelNewProperty));

        }));

        it('should provide all atifacts names of models except the current when requested', async(() => {
            cut['_dataModelProject'] = dataWithModel1And2;

            eventService.publishEvent(new NewViewEvent(artefactId1, true));

            cut.getDataModelsExceptCurrent()
                .pipe(take(1))
                .subscribe(models => {
                    expect(models.length).toBe(1);
                    expect(models[0]).toBe(artefactId2);
                });

        }));

        it('should set a reference to different model and provide the referenced model', async(() => {
            cut['_dataModelProject'] = dataWithModel1And2;

            eventService.publishEvent(new NewViewEvent(artefactId1, true));

            cut.setCurrentDataModelReference(artefactId2);

            cut.getDataModel()
                .pipe(take(1))
                .subscribe(model => expect(model).toEqual(dataModel2));
        }));

        it('should reset a given reference to new objectmodel when setting it to null', async(() => {
            cut['_dataModelProject'] = dataWithModel1ReferencingModel2;
            eventService.publishEvent(new NewViewEvent(artefactId1, true));

            cut.setCurrentDataModelReference(null);

            cut.getDataModel()
                .pipe(take(1))
                .subscribe(model => expect(model).toEqual({ type: 'object' }));
        }));

        it('should provide a datamodel reference', async(() => {
            cut['_dataModelProject'] = dataWithModel1ReferencingModel2;
            eventService.publishEvent(new NewViewEvent(artefactId1, true));

            cut.getCurrentDataModelReference().subscribe(ref => expect(ref).toEqual(artefactId2));
        }));
    });
});
